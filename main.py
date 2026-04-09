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
    user_text: str
    filename: str

@app.post("/api/register")
async def register_user(user: UserRegister):
    # ... (giữ nguyên Auth)
    existing_user = await database.users.find_one({"email": user.email})
    if existing_user: raise HTTPException(status_code=400, detail="Email này đã được sử dụng!")
    hashed_password = pwd_context.hash(user.password)
    new_user = {"username": user.username, "email": user.email, "password": hashed_password, "created_at": datetime.utcnow()}
    await database.users.insert_one(new_user)
    return {"message": "Tạo tài khoản thành công!"}

@app.post("/api/login")
async def login_user(user: UserLogin):
    # ... (giữ nguyên Auth)
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

# 🚀 Hàm lấy file thông minh (Cốt lõi giúp hết lỗi 429)
def get_gemini_file(file_path):
    file_key = os.path.basename(file_path)
    
    # 1. Nếu file đã có sẵn trên Google -> Tái sử dụng luôn (Nhanh gấp 5 lần)
    if file_key in UPLOADED_FILES_CACHE:
        try:
            print(f"⚡ [CACHE HIT] Đang dùng lại file {file_key} trên Google...")
            return ai_client.files.get(name=UPLOADED_FILES_CACHE[file_key])
        except Exception:
            pass # Lỗi thì đi tiếp để upload lại
            
    # 2. Nếu chưa có -> Upload và lưu vào bộ nhớ đệm
    print(f"⏳ [CACHE MISS] Upload lần đầu file {file_key} lên Google...")
    g_file = ai_client.files.upload(file=file_path)
    wait_for_gemini_file(g_file)
    
    UPLOADED_FILES_CACHE[file_key] = g_file.name # Lưu lại mã số file
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
            # Upload 1 lần duy nhất lúc vừa thả file vào Dashboard
            g_file = get_gemini_file(file_location) 
            res = ai_client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=[g_file, "Tóm tắt 3 từ khóa chính của tài liệu này, ngăn cách bằng dấu phẩy. TUYỆT ĐỐI không giải thích thêm."]
            )
            if res.text: ai_keywords = res.text.strip()
            # BỎ DÒNG DELETE FILE Ở ĐÂY ĐỂ GIỮ FILE CHO BƯỚC CHAT
        except Exception as ai_err:
            print(f"[CẢNH BÁO UPLOAD] Bỏ qua lỗi Gemini do quá tải: {ai_err}")
            
        return {"filename": safe_filename, "ai_keywords": ai_keywords}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_doc(req: ChatRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        # Chỉ tốn chưa tới 1 giây nếu file đã được upload từ Dashboard
        g_file = get_gemini_file(file_path)
        
        prompt = f"Bạn là Trợ lý AI. Trả lời dựa trên file {os.path.basename(file_path)}. Câu hỏi: '{req.message}'"
        res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[g_file, prompt])
        
        # BỎ DÒNG DELETE LUN
        return {"reply": res.text}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail="Bi đang bị hụt hơi do vượt quá hạn mức. Long đợi 30s rồi gửi lại nhé! 🕒")
        elif "503" in error_msg or "UNAVAILABLE" in error_msg:
            raise HTTPException(status_code=503, detail="Server Gemini đang nghẽn mạng toàn cầu. Long đợi 30s rồi bấm gửi lại nha! 🚦")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi AI: {error_msg}")

@app.post("/api/research-check")
async def research_check(req: ResearchRequest):
    try:
        decoded_filename = unquote(req.filename)
        file_path = get_target_file(decoded_filename)
        if not file_path: raise HTTPException(status_code=404, detail="Không tìm thấy file!")

        g_file = get_gemini_file(file_path)
        
        prompt = f"So sánh đoạn văn: '{req.user_text}' với tài liệu. Trả về JSON: {{'similarity': '%', 'feedback': 'nhận xét', 'rewrites': ['cách 1'], 'next_steps': 'gợi ý'}}"
        res = ai_client.models.generate_content(model='gemini-2.5-flash', contents=[g_file, prompt])
        clean_json = res.text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(clean_json)
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail="Hệ thống check đang quá tải. Đợi 30s rồi thử lại nhé Long!")
        elif "503" in error_msg or "UNAVAILABLE" in error_msg:
            raise HTTPException(status_code=503, detail="Server Google nghẽn mạng, không soi đạo văn được lúc này. Đợi 30s nhé!")
        else:
            raise HTTPException(status_code=500, detail=f"Lỗi Server: {error_msg}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)