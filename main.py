import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from motor.motor_asyncio import AsyncIOMotorClient
from google.oauth2 import id_token
from google.auth.transport import requests

load_dotenv()
app = FastAPI(
    title="Hanu Plagiarism & Auth API",
    description="Hệ thống Backend Final của Long & Trung Quang",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb+srv://thanhlinhbaby99_db_user:ywdEiWek790teTBP@cluster0.your_url.mongodb.net/?retryWrites=true&w=majority")
client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.hanu_plagiarism
user_collection = database.get_collection("users")

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
VALID_TOKEN = os.environ.get("APP_SECRET_TOKEN")
GOOGLE_CLIENT_ID = "689947844059-vpb6vte9uocu05118d0r9v0u6p67oov6.apps.googleusercontent.com"

ai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Dependency kiểm tra API Key (cho các app bên thứ 3)
def check_auth(api_key: str = Depends(api_key_header)):
    if api_key == VALID_TOKEN:
        return api_key
    raise HTTPException(status_code=403, detail="Sai mã xác thực!")

@app.get("/")
async def root():
    return {"status": "Online", "database": "Connected to MongoDB Atlas"}

class LoginRequest(BaseModel):
    token: str

@app.post("/auth/google")
async def google_auth(req: LoginRequest):
    try:
        # Xác thực token từ Google gửi về
        idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), GOOGLE_CLIENT_ID)
        
        user_data = {
            "email": idinfo['email'],
            "full_name": idinfo.get('name'),
            "picture": idinfo.get('picture'),
            "last_login": idinfo.get('iat'),
            "role": "student"
        }

        # Lưu/Cập nhật user vào MongoDB
        await user_collection.update_one(
            {"email": user_data["email"]},
            {"$set": user_data},
            upsert=True
        )
        return {"status": "success", "user": user_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/check-plagiarism")
async def check_plagiarism(
    file: UploadFile = File(...), 
    api_key: str = Depends(check_auth)
):
    try:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        uploaded_to_gemini = ai_client.files.upload(file=temp_path)
        
        prompt = "Bạn là chuyên gia kiểm định đạo văn tại HANU. Hãy phân tích tài liệu này..."
        
        response = ai_client.models.generate_content(
            model='gemini-2.0-flash', 
            contents=[uploaded_to_gemini, prompt]
        )
        
        os.remove(temp_path)
        return {
            "filename": file.filename,
            "ai_analysis": response.text
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)