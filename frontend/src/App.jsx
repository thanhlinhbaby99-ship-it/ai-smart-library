import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'; // Đường dẫn tới file Login của cậu
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Mặc định vào trang Login */}
        <Route path="/" element={<Login />} />
        
        {/* 2. Trang Dashboard chính sau khi login */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* 3. Trang AI Workspace chuyên sâu */}
        <Route path="/workspace" element={<Workspace />} />
        
        {/* 4. Nếu gõ bậy bạ đường dẫn thì quay về Login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;