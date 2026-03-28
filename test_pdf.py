import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("Ê, chưa có API Key kìa!")
else:
    try:
        client = genai.Client(api_key=api_key)
        
        file_path = "sample.pdf" 
        
        print(f"Đang tải file '{file_path}' lên hệ thống của Google...")
        
        uploaded_file = client.files.upload(file=file_path)
        print("Tải lên thành công! Đang nhờ Gemini đọc và phân tích...")
        
        prompt = "Hãy đọc kỹ file PDF này và tóm tắt 3 ý chính quan trọng nhất bằng tiếng Việt."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt]
        )
        
        print("\n=== KẾT QUẢ PHÂN TÍCH TỪ GEMINI ===")
        print(response.text)
        print("===================================")
        
    except Exception as e:
        print("Có lỗi xảy ra rồi:", str(e))