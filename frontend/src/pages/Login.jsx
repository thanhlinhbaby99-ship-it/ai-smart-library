import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true); // Mặc định để đăng nhập cho tiện
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = isLoginMode 
      ? { email: formData.email, password: formData.password }
      : { username: formData.username, email: formData.email, password: formData.password };

    try {
      // SỬA LỖI QUAN TRỌNG: Dùng dấu backtick ` để template string hoạt động
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.detail || 'Có lỗi xảy ra, vui lòng thử lại!');
      } else {
        if (isLoginMode) {
          // Lưu dữ liệu vào localStorage
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user_info));
          
          setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          setSuccessMsg(data.message);
          setIsLoginMode(true);
          setFormData({ ...formData, password: '' });
        }
      }
    } catch (error) {
      setErrorMsg('Lỗi: Không thể kết nối đến Server Python (Cổng 8000).');
    }
  };

  return (
    <div className="min-h-screen bg-[#6B46C1] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[32px] shadow-2xl flex max-w-4xl w-full overflow-hidden border border-purple-100">
        
        {/* LEFT BANNER */}
        <div className="hidden md:flex flex-col w-1/2 bg-purple-50 p-12 items-center justify-center text-center">
          <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-purple-100 mb-6">
             <img 
               src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop" 
               alt="Library" 
               className="rounded-2xl w-full h-48 object-cover"
             />
          </div>
          <h3 className="text-2xl font-black text-purple-900 mb-3 tracking-tight">AI Smart Library</h3>
          <p className="text-sm text-purple-600 leading-relaxed font-medium">Hệ thống phân tích tài liệu và kiểm tra đạo văn thông minh dành cho sinh viên HANU.</p>
        </div>

        {/* RIGHT FORM */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {isLoginMode ? 'Mừng cậu quay lại!' : 'Tạo tài khoản mới'}
            </h2>
            <p className="text-gray-500 text-sm">Cùng Bi bắt đầu buổi nghiên cứu hôm nay nhé.</p>
          </div>

          {errorMsg && <div className="p-4 mb-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl font-medium animate-shake">{errorMsg}</div>}
          {successMsg && <div className="p-4 mb-6 text-sm text-green-600 bg-green-50 border border-green-100 rounded-2xl font-medium">{successMsg}</div>}

          <div className="space-y-4">
            {!isLoginMode && (
              <input 
                type="text" name="username" value={formData.username} onChange={handleChange}
                placeholder="Họ và tên của cậu" 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-400 outline-none transition-all" 
              />
            )}
            
            <input 
              type="email" name="email" value={formData.email} onChange={handleChange}
              placeholder="Email sinh viên (@hanu.edu.vn)" 
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-400 outline-none transition-all" 
            />
            
            <input 
              type="password" name="password" value={formData.password} onChange={handleChange}
              placeholder="Mật khẩu" 
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-400 outline-none transition-all" 
            />
          </div>
          
          <button 
            onClick={handleSubmit}
            className="w-full mt-8 py-4 bg-[#6B46C1] text-white rounded-2xl font-bold hover:bg-[#5a3aa3] transition-all shadow-lg shadow-purple-200"
          >
            {isLoginMode ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-8">
            {isLoginMode ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <span 
              onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); }} 
              className="text-[#6B46C1] font-bold cursor-pointer hover:underline"
            >
              {isLoginMode ? 'Đăng ký' : 'Đăng nhập'}
            </span>
          </p>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Hoặc</span></div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={() => navigate('/dashboard')}
              onError={() => setErrorMsg("Lỗi kết nối Google!")}
              theme="outline" size="large" shape="pill"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;