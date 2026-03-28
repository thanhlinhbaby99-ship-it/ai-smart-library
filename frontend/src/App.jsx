import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định sẽ vào phòng Đăng nhập */}
        <Route path="/" element={<Login />} />
        
        {/* Đường dẫn /dashboard sẽ mở trang Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Nếu người dùng gõ bậy bạ đường dẫn, tự động đuổi về trang chủ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;