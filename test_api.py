import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("Ê, chưa có API Key kìa! Kiểm tra lại file .env đi.")
else:
    try:
        client = genai.Client(api_key=api_key)
        
        print("Đang kết nối với Gemini (Bản siêu cấp mới)...")
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents="Xin chào, hãy giới thiệu bản thân trong 1 câu ngắn gọn bằng tiếng Việt."
        )
        
        print("\n=== KẾT QUẢ ===")
        print(response.text)
        print("===============")
        
    except Exception as e:
        print("Có lỗi xảy ra rồi:", str(e))