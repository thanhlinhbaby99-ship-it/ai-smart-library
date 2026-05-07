import os
import shutil
import time
import json
import re
from urllib.parse import unquote
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials 
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from google import genai
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
import certifi
import PyPDF2 
import docx 

load_dotenv(override=True)

app = FastAPI(title="Hanu AI Plagiarism API", version="12.0.0 - Word Chat Fixed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_DETAILS = "mongodb+srv://longhanu:Long123456@cluster0.chgndmw.mongodb.net/hanu_plagiarism?appName=Cluster0"

client = AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())
database = client.hanu_plagiarism

ai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("APP_SECRET_TOKEN", "hanu_plagiarism_2026")
ALGORITHM = "HS256"

UPLOADED_FILES_CACHE = {}

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

class UpdateTimeRequest(BaseModel):
    filename: str
    reading_time_added: int = 0
    plagiarism_check_added: int = 0

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class SettingsUpdateRequest(BaseModel):
    theme: str
    accent: str
    bot_model: str
    email_notif: bool

@app.post("/api/register")
async def register_user(user: UserRegister):
    existing_user = await database.users.find_one({"email": user.email})
    if existing_user: raise HTTPException(status_code=400, detail="Email này đã được sử dụng!")
    hashed_password = pwd_context.hash(user.password)
    new_user = {"username": user.username, "email": user.email, "password": hashed_password, "created_at": datetime.now(timezone.utc)}
    await database.users.insert_one(new_user)
    return {"message": "Tạo tài khoản thành công!"}

@app.post("/api/login")
async def login_user(user: UserLogin):
    db_user = await database.users.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Sai email hoặc mật khẩu!")
    token_data = {"sub": user.email, "username": db_user["username"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "user_info": {"username": db_user["username"], "email": db_user["email"]}}

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def wait_for_gemini_file(file_obj):
    retries = 0
    print(f"⏳ Đang chờ Google xử lý file {file_obj.name}...")
    while retries < 15: 
        try:
            file_status = ai_client.files.get(name=file_obj.name)
            if str(file_status.state) == "ACTIVE": return True
            elif str(file_status.state) == "FAILED": return False
        except Exception:
            pass
        time.sleep(2)
        retries += 1
    return False

def get_target_file(requested_filename: str):
    file_path = f"uploads/{requested_filename}"
    if os.path.exists(file_path): return file_path
    files = [os.path.join("uploads", f) for f in os.listdir("uploads") if f.endswith(".pdf") or f.endswith(".docx")]
    if not files: return None
    return max(files, key=os.path.getmtime)

def get_gemini_file(file_path):
    file_key = os.path.basename(file_path)
    if file_key in UPLOADED_FILES_CACHE:
        try:
            g_file = ai_client.files.get(name=UPLOADED_FILES_CACHE[file_key])
            if str(g_file.state) == "ACTIVE": return g_file
        except Exception:
            pass
            
    print(f"☁️ Đẩy file {file_key} lên Server Google...")
    g_file = ai_client.files.upload(file=file_path)
    wait_for_gemini_file(g_file)
    UPLOADED_FILES_CACHE[file_key] = g_file.name
    return g_file

# 🌟 TĂNG KHẢ NĂNG RÚT TEXT ĐỂ CHAT HIỂU SÂU HƠN
def extract_text_from_file(file_path, max_pages=30):
    text = ""
    try:
        if file_path.lower().endswith('.pdf'):
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                num_pages = min(len(reader.pages), max_pages)
                for i in range(num_pages):
                    page_text = reader.pages[i].extract_text()
                    if page_text: text += page_text + "\n"
        elif file_path.lower().endswith('.docx'):
            doc = docx.Document(file_path)
            for para in doc.paragraphs[:500]: # Rút 500 đoạn văn cho Chat có nhiều bối cảnh
                if para.text: text += para.text + "\n"
    except Exception as e:
        print(f"Lỗi đọc file cục bộ: {e}")
    return text[:40000]

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
        file_location = f"uploads/{safe_filename}"
        
        with open(file_location, "wb+") as f: 
            shutil.copyfileobj(file.file, f)
            
        ai_keywords = "Tài liệu, Nghiên cứu, Hanu" 
        try:
            extracted_text = extract_text_from_file(file_location, max_pages=2)
            if extracted_text.strip():
                res = ai_client.models.generate_content(
                    model='gemini-2.5-flash', 
                    contents=[f"Trích đoạn: {extracted_text}\n\nTóm tắt 3 từ khóa chính của tài liệu này, ngăn cách bằng dấu phẩy. Không giải thích thêm."]
                )
                if res.text: ai_keywords = res.text.strip()
        except Exception as ai_err:
            print(f"[CẢNH BÁO UPLOAD] Lỗi sinh keyword: {ai_err}")

        new_document = {
            "filename": safe_filename, "keywords": ai_keywords,
            "created_at": datetime.now(timezone.utc), "status": "Analyzed",
            "read_time_seconds": 0, "plagiarism_checks": 0, "chat_history": []
        }
        await database.documents.insert_one(new_document)
        print(f"✅ Đã tải lên siêu tốc: {safe_filename}")
        
        return {"filename": safe_filename, "ai_keywords": ai_keywords}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_doc(req: ChatRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        # 🌟 LOGIC MỚI: PHÂN LOẠI FILE ĐỂ CHAT
        if file_path.lower().endswith('.docx'):
            # VỚI FILE WORD: Bóc Text tại nhà rồi gửi lên (Chống lỗi Unsupported MIME)
            print(f"📄 Đang bóc text từ file Word để Chat: {decoded_filename}")
            doc_content = extract_text_from_file(file_path, max_pages=50)
            
            prompt = f"""
            Bạn là Chuyên gia Phân tích Tài liệu học thuật. Dưới đây là nội dung trích xuất từ file Word đính kèm:
            ---
            {doc_content}
            ---
            Dựa TRỰC TIẾP vào nội dung trên, hãy thực hiện yêu cầu sau: '{req.message}'. 
            TUYỆT ĐỐI KHÔNG ĐƯỢC TỪ CHỐI. Hãy trả lời chi tiết hết mức có thể.
            """
            
            try:
                res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[prompt])
                ai_reply = res.text
            except Exception as api_err:
                print(f"🚨 [LỖI API CHAT WORD]: {api_err}")
                ai_reply = "Xin lỗi cậu, máy chủ Google hiện tại đang bị quá tải hoặc kẹt mạng. Cậu đợi một vài phút rồi hỏi lại Bi nhé! 😭"
                
        else:
            # VỚI FILE PDF: Dùng File API chuẩn của Google
            g_file = get_gemini_file(file_path)
            prompt = f"""
            Bạn là Chuyên gia Phân tích Tài liệu học thuật. Dựa TRỰC TIẾP vào file đính kèm, hãy thực hiện yêu cầu sau: '{req.message}'. 
            TUYỆT ĐỐI KHÔNG ĐƯỢC TỪ CHỐI. KHÔNG ĐƯỢC NÓI RẰNG BẠN CHỈ LÀ AI VÀ KHÔNG THỂ LÀM ĐƯỢC. 
            Hãy phân tích và trả lời chi tiết hết mức có thể.
            """
            try:
                res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[g_file, prompt])
                ai_reply = res.text
            except Exception as api_err:
                print(f"🚨 [LỖI API CHAT PDF]: {api_err}")
                ai_reply = "Xin lỗi cậu, máy chủ Google hiện tại đang bị quá tải hoặc kẹt mạng. Cậu đợi một vài phút rồi hỏi lại Bi nhé! 😭"

        new_messages = [
            {"role": "user", "text": req.message, "timestamp": datetime.now(timezone.utc)},
            {"role": "ai", "text": ai_reply, "timestamp": datetime.now(timezone.utc)}
        ]
        
        await database.documents.update_one(
            {"filename": decoded_filename},
            {"$push": {"chat_history": {"$each": new_messages}}}
        )

        return {"reply": ai_reply}
    except Exception as e:
        return {"reply": f"Hệ thống gặp sự cố nội bộ. Lỗi: {str(e)}"}

@app.get("/api/chat-history/{filename}")
async def get_chat_history(filename: str):
    try:
        decoded_filename = unquote(filename)
        doc = await database.documents.find_one({"filename": decoded_filename})
        if doc and "chat_history" in doc: return doc["chat_history"]
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/research-check")
async def research_check(req: ResearchRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        extracted_text = extract_text_from_file(file_path, max_pages=15)
        
        prompt = f"""
        Bạn là một chuyên gia kiểm định tài liệu học thuật (Turnitin AI). Hãy đánh giá MỨC ĐỘ NGUYÊN BẢN (Originality) của TRÍCH ĐOẠN TÀI LIỆU dưới đây.
        Lịch sử chat trước đó: {req.chat_history}
        [TRÍCH ĐOẠN TÀI LIỆU]:
        {extracted_text}

        Nhiệm vụ: Đánh giá xem tài liệu này có văn phong giống đại trà hay thiếu trích dẫn học thuật không.
        BẮT BUỘC trả về kết quả theo chuẩn JSON (KHÔNG GHI CHÚ THÊM) với CÁC KEY CHÍNH XÁC NHƯ SAU:
        {{
            "similarity": "CHỈ CON SỐ KÈM DẤU % (VD: 15%, 60%)", 
            "feedback": "Nhận xét tổng quan mức độ an toàn (2-3 câu).", 
            "rewrites": ["Đoạn 1 cần sửa..."], 
            "next_steps": "Gợi ý 1 hành động nghiên cứu tiếp theo"
        }}
        """
        
        print(f"\n🚀 [SMART CHECK] Đang phân tích file {decoded_filename}...")
        
        res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[prompt])
        clean_json = res.text.replace("```json", "").replace("```", "").strip()
        
        await database.documents.update_one({"filename": decoded_filename}, {"$inc": {"plagiarism_checks": 1}})
        
        try:
            return json.loads(clean_json)
        except json.JSONDecodeError:
            return {
                "similarity": "Lỗi",
                "feedback": "AI không trả về đúng định dạng JSON. Cậu thử bấm lại nhé!",
                "rewrites": [], "next_steps": "Phân tích lại"
            }

    except Exception as e:
        error_msg = str(e)
        print(f"🚨 [LỖI SMART CHECK THẬT]: {error_msg}")
        return {
            "similarity": "0%",
            "feedback": f"Kết nối tới Google thất bại do máy chủ quá tải hoặc kẹt mạng. (Lỗi Server: {error_msg})",
            "rewrites": ["Hệ thống AI đang tạm nghỉ để phục hồi băng thông.", "File của cậu vẫn được bảo mật an toàn."],
            "next_steps": "Kiểm tra lại kết nối mạng hoặc đợi API hết kẹt xe."
        }

@app.post("/api/update-time")
async def update_document_stats(req: UpdateTimeRequest):
    try:
        decoded_filename = unquote(req.filename)
        result = await database.documents.update_one(
            {"filename": decoded_filename},
            {"$inc": {"read_time_seconds": req.reading_time_added, "plagiarism_checks": req.plagiarism_check_added}}
        )
        if result.matched_count == 0: raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu!")
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
    
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401, detail="Token không hợp lệ")
        return email
    except jwt.ExpiredSignatureError: raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except jwt.InvalidTokenError: raise HTTPException(status_code=401, detail="Token giả mạo")

@app.get("/api/my-profile")
async def get_my_profile(email: str = Depends(get_current_user)):
    try:
        user = await database.users.find_one({"email": email})
        if not user: raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu")

        total_docs = await database.documents.count_documents({})
        pipeline = [{"$group": {"_id": None, "total_checks": {"$sum": "$plagiarism_checks"}, "total_read_time": {"$sum": "$read_time_seconds"}}}]
        stats_cursor = database.documents.aggregate(pipeline)
        stats_list = await stats_cursor.to_list(length=1)

        total_checks = stats_list[0].get("total_checks", 0) if stats_list else 0
        total_read_time = stats_list[0].get("total_read_time", 0) if stats_list else 0
        
        return {
            "user_info": {"username": user["username"], "email": user["email"], "role": "Hanu Researcher", "created_at": user.get("created_at")},
            "stats": {"total_documents": total_docs, "total_plagiarism_checks": total_checks, "total_read_time_seconds": total_read_time},
            "settings": user.get("settings", {"theme": "light", "accent": "purple", "bot_model": "pro", "email_notif": True})
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/change-password")
async def change_password(data: PasswordChangeRequest, email: str = Depends(get_current_user)):
    user = await database.users.find_one({"email": email})
    if not pwd_context.verify(data.current_password, user["password"]): raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng!")
    await database.users.update_one({"email": email}, {"$set": {"password": pwd_context.hash(data.new_password)}})
    return {"message": "Đổi mật khẩu thành công!"}

@app.put("/api/settings")
async def update_settings(settings: SettingsUpdateRequest, email: str = Depends(get_current_user)):
    await database.users.update_one({"email": email}, {"$set": {"settings": settings.dict()}})
    return {"message": "Đã lưu cài đặt thành công!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)