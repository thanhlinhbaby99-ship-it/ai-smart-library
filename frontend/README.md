# 🚀 Hệ Thống Kiểm Tra Đạo Văn AI (HANU)

Đồ án môn học **Big Data Mining** - Trường Đại học Hà Nội (HANU).
Hệ thống sử dụng Trí tuệ nhân tạo để phân tích, đối chiếu và phát hiện các dấu hiệu đạo văn trong tài liệu học thuật.

## 👨‍💻 Nhóm Phát Triển
* **Long** 

## 🛠 Công Nghệ Sử Dụng
* **Frontend:** React.js, Tailwind CSS, Vite.
* **Backend:** FastAPI, Python.
* **Database:** MongoDB Atlas (Cloud).
* **AI Engine:** Google Gemini 2.0 Flash.
* **Authentication:** Google OAuth2.0.

## ⚙️ Hướng Dẫn Cài Đặt

### 1. Cấu hình môi trường (.env)
Tạo file `.env` tại thư mục gốc và cung cấp các khóa bảo mật:
```env
GEMINI_API_KEY=your_gemini_key
APP_SECRET_TOKEN=your_secret_token
MONGO_DETAILS=your_mongodb_atlas_connection_string