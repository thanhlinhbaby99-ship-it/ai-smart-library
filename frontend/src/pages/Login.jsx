import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#8A2BE2] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl flex max-w-4xl w-full overflow-hidden transition-all duration-500 hover:shadow-indigo-500/20">
        
        {/* NỬA TRÁI: Banner (Hiện trên Desktop) */}
        <div className="hidden md:flex flex-col w-1/2 bg-indigo-50 p-10 items-center justify-center text-center">
          <img 
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop" 
            alt="Library" 
            className="w-4/5 h-64 object-cover rounded-2xl mb-6 shadow-lg transform hover:scale-105 transition duration-500"
          />
          <h3 className="text-xl font-bold text-indigo-800 mb-2">AI Smart Research Assistant</h3>
          <p className="text-sm text-indigo-600">Phân tích đạo văn và quản lý tài liệu học thuật thông minh cùng Gemini AI.</p>
        </div>

        {/* NỬA PHẢI: Form đăng nhập chuẩn Figma */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Create your Account</h2>
          <p className="text-sm text-gray-500 mb-8">Bắt đầu quản lý tài liệu tại HANU ngay hôm nay</p>

          <input type="text" placeholder="Full Name" className="w-full p-3 mb-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none" />
          <input type="email" placeholder="Academic Email" className="w-full p-3 mb-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none" />
          <input type="password" placeholder="Password" className="w-full p-3 mb-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none" />
          
          <button className="w-full p-3 bg-[#4C51BF] text-white rounded-xl font-bold hover:bg-[#434190] transition duration-300 mb-4 shadow-md">
            Create Account
          </button>

          <div className="text-center text-sm text-gray-600 mb-6">
            Already have an account? <span className="text-[#4C51BF] font-bold cursor-pointer hover:underline">Log in</span>
          </div>

          <div className="flex items-center mb-6">
            <div className="flex-1 border-b border-gray-300"></div>
            <span className="px-3 text-gray-400 text-sm font-medium">HOẶC</span>
            <div className="flex-1 border-b border-gray-300"></div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={credentialResponse => {
                console.log("Đăng nhập thành công!");
                navigate('/dashboard'); 
              }}
              onError={() => alert("Lỗi kết nối Google!")}
              shape="rectangular" theme="outline" size="large" text="signup_with"
            />
          </div>
          
          <div className="text-center mt-8 text-xs text-gray-400">
            &copy; 2026 HANU Data Mining Project
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;