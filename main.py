import os
import shutil
import time
import json
import re
from urllib.parse import unquote
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from google import genai
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import certifi

load_dotenv()
app = FastAPI(title="Hanu AI Plagiarism API", version="3.0.0 - Caching Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_DETAILS = os.getenv("MONGO_DETAILS")
client = AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())
database = client.hanu_plagiarism
user_collection = database.get_collection("users")

ai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("APP_SECRET_TOKEN", "hanu_plagiarism_2026")
ALGORITHM = "HS256"

# ==========================================
# 🌟 TUYỆT CHIÊU CACHE (BỘ NHỚ ĐỆM) CỦA BI 🌟
# Dùng để nhớ các file đã đưa lên Google, tránh upload lại gây lỗi 429
UPLOADED_FILES_CACHE = {}
# ==========================================

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    message: str
    filename: str

class ResearchRequest(BaseModel):
    chat_history: str
    filename: str

# ---> MODEL MỚI: Dành cho API update-time <---
class UpdateTimeRequest(BaseModel):
    filename: str
    reading_time_added: int = 0      # Số giây đọc muốn cộng thêm
    plagiarism_check_added: int = 0  # Số lần check đạo văn muốn cộng thêm (thường là 1)

@app.post("/api/register")
async def register_user(user: UserRegister):
    existing_user = await database.users.find_one({"email": user.email})
    if existing_user: raise HTTPException(status_code=400, detail="Email này đã được sử dụng!")
    hashed_password = pwd_context.hash(user.password)
    new_user = {"username": user.username, "email": user.email, "password": hashed_password, "created_at": datetime.utcnow()}
    await database.users.insert_one(new_user)
    return {"message": "Tạo tài khoản thành công!"}

@app.post("/api/login")
async def login_user(user: UserLogin):
    db_user = await database.users.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Sai email hoặc mật khẩu!")
    token_data = {"sub": user.email, "username": db_user["username"], "exp": datetime.utcnow() + timedelta(days=7)}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "user_info": {"username": db_user["username"], "email": db_user["email"]}}

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- AI CORE VỚI CƠ CHẾ CACHE THÔNG MINH ---
def wait_for_gemini_file(file_obj):
    while True:
        file_status = ai_client.files.get(name=file_obj.name)
        if str(file_status.state) != "PROCESSING": break
        time.sleep(2)

def get_target_file(requested_filename: str):
    file_path = f"uploads/{requested_filename}"
    if os.path.exists(file_path): return file_path
    files = [os.path.join("uploads", f) for f in os.listdir("uploads") if f.endswith(".pdf")]
    if not files: return None
    return max(files, key=os.path.getmtime)

def get_gemini_file(file_path):
    file_key = os.path.basename(file_path)
    
    if file_key in UPLOADED_FILES_CACHE:
        try:
            print(f"⚡ [CACHE HIT] Đang dùng lại file {file_key} trên Google...")
            return ai_client.files.get(name=UPLOADED_FILES_CACHE[file_key])
        except Exception:
            pass
            
    print(f"⏳ [CACHE MISS] Upload lần đầu file {file_key} lên Google...")
    g_file = ai_client.files.upload(file=file_path)
    wait_for_gemini_file(g_file)
    
    UPLOADED_FILES_CACHE[file_key] = g_file.name
    return g_file

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
        file_location = f"uploads/{safe_filename}"
        
        with open(file_location, "wb+") as f: 
            shutil.copyfileobj(file.file, f)
            
        print(f"\n[UPLOAD] Đã lưu cứng: {safe_filename}")
        ai_keywords = "API_Đang_Bận, Google_Quá_Tải, Đợi_30s_Thử_Lại" 
        
        try:
            g_file = get_gemini_file(file_location) 
            res = ai_client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=[g_file, "Tóm tắt 3 từ khóa chính của tài liệu này, ngăn cách bằng dấu phẩy. TUYỆT ĐỐI không giải thích thêm."]
            )
            if res.text: ai_keywords = res.text.strip()
        except Exception as ai_err:
            print(f"[CẢNH BÁO UPLOAD] Bỏ qua lỗi Gemini do quá tải: {ai_err}")

        # ---> CẬP NHẬT TRƯỜNG DỮ LIỆU ĐỂ PHỤC VỤ DASHBOARD <---
        new_document = {
            "filename": safe_filename,
            "keywords": ai_keywords,
            "created_at": datetime.utcnow(),
            "status": "Analyzed",
            "read_time_seconds": 0,    # Mặc định thời gian đọc là 0
            "plagiarism_checks": 0,    # Mặc định số lần check là 0
            "chat_history": []         # Khởi tạo mảng chat rỗng khi có file mới
        }
        await database.documents.insert_one(new_document)
            
        return {"filename": safe_filename, "ai_keywords": ai_keywords}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_doc(req: ChatRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        g_file = get_gemini_file(file_path)
        
        prompt = f"Bạn là Trợ lý AI. Trả lời dựa trên file {os.path.basename(file_path)}. Câu hỏi: '{req.message}'"
        res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[g_file, prompt])
        
        ai_reply = res.text

        # ---> CODE MỚI: TỰ ĐỘNG LƯU VÀO MONGODB <---
        # Tạo format tin nhắn
        new_messages = [
            {"role": "user", "text": req.message, "timestamp": datetime.utcnow()},
            {"role": "ai", "text": ai_reply, "timestamp": datetime.utcnow()}
        ]
        
        # Bơm mảng tin nhắn này vào field 'chat_history' của document hiện tại
        await database.documents.update_one(
            {"filename": decoded_filename},
            {"$push": {"chat_history": {"$each": new_messages}}}
        )

        return {"reply": ai_reply}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail="Bi đang bị hụt hơi do vượt quá hạn mức. Long đợi 30s rồi gửi lại nhé! 🕒")
        elif "503" in error_msg or "UNAVAILABLE" in error_msg:
            raise HTTPException(status_code=503, detail="Server Gemini đang nghẽn mạng toàn cầu. Long đợi 30s rồi bấm gửi lại nha! 🚦")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi AI: {error_msg}")

# ---> CODE MỚI: API LẤY LỊCH SỬ CHAT CỦA 1 FILE <---
@app.get("/api/chat-history/{filename}")
async def get_chat_history(filename: str):
    try:
        decoded_filename = unquote(filename)
        doc = await database.documents.find_one({"filename": decoded_filename})
        
        if doc and "chat_history" in doc:
            return doc["chat_history"]
        return [] # Nếu chưa chat gì thì trả về mảng rỗng
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/research-check")
async def research_check(req: ResearchRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        g_file = get_gemini_file(file_path)
        
        prompt = f"""
        Bạn là một chuyên gia kiểm định tài liệu học thuật (Turnitin AI).
        Hãy đánh giá MỨC ĐỘ NGUYÊN BẢN (Originality) của TÀI LIỆU ĐÍNH KÈM (PDF) dựa trên kiến thức của bạn và các thông tin đã trao đổi trong lịch sử chat dưới đây.

        [LỊCH SỬ CHAT VỚI NGƯỜI DÙNG]:
        {req.chat_history}

        Nhiệm vụ:
        1. Đánh giá xem tài liệu này có văn phong giống các bài viết đại trà trên mạng không.
        2. Dựa vào lịch sử chat, tổng hợp các rủi ro đạo văn hoặc thiếu trích dẫn.
        
        BẮT BUỘC trả về CHỈ MỘT cục JSON theo đúng format dưới đây (tuyệt đối không giải thích thêm, không dùng markdown):
        {{
            "similarity": "Đánh giá % rủi ro (VD: 15%)", 
            "feedback": "Tổng hợp mức độ an toàn/rủi ro đạo văn của tài liệu này (Ngắn gọn).", 
            "rewrites": ["Gợi ý 1 điểm cần cải thiện/thêm trích dẫn trong tài liệu", "Gợi ý 2 về cách nâng cấp lập luận"], 
            "next_steps": "Gợi ý hành động tiếp theo để nâng cấp bài viết này"
        }}
        """
        
        res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[g_file, prompt])
        clean_json = res.text.replace("```json", "").replace("```", "").strip()
        
        # Tự động cộng 1 vào số lần check đạo văn của file này mỗi khi API này được gọi thành công
        await database.documents.update_one(
            {"filename": decoded_filename},
            {"$inc": {"plagiarism_checks": 1}}
        )

        try:
            return json.loads(clean_json)
        except json.JSONDecodeError:
            print(f"\n[LỖI JSON] Gemini trả về linh tinh: {res.text}")
            return {
                "similarity": "N/A",
                "feedback": "Hệ thống đang tổng hợp dữ liệu, vui lòng chat thêm vài câu về tài liệu để AI có thêm cơ sở đánh giá.",
                "rewrites": ["Hãy hỏi AI phân tích thêm về các chương trong tài liệu."],
                "next_steps": "Tiếp tục trao đổi ở khung chat."
            }

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail="Hệ thống check đang quá tải. Đợi 30s rồi thử lại nhé Long!")
        elif "503" in error_msg or "UNAVAILABLE" in error_msg:
            raise HTTPException(status_code=503, detail="Server Google nghẽn mạng, không soi đạo văn được lúc này. Đợi 30s nhé!")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi Server: {error_msg}")

# ---> CODE MỚI: API CHUYÊN BIỆT ĐỂ CẬP NHẬT STATS (Thời gian đọc, v.v...) <---
@app.post("/api/update-time")
async def update_document_stats(req: UpdateTimeRequest):
    try:
        decoded_filename = unquote(req.filename)
        
        # Sử dụng $inc của MongoDB để cộng dồn số liệu thay vì ghi đè
        result = await database.documents.update_one(
            {"filename": decoded_filename},
            {"$inc": {
                "read_time_seconds": req.reading_time_added,
                "plagiarism_checks": req.plagiarism_check_added
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong Database!")
            
        return {"message": "Đã cập nhật số liệu Dashboard thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def get_documents():
    try:
        cursor = database.documents.find().sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        
        result = []
        for doc in docs:
            doc["_id"] = str(doc["_id"]) 
            result.append(doc)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)