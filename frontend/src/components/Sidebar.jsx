import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiClock, FiSettings, FiPlus, FiMessageSquare } from 'react-icons/fi';

const Sidebar = () => {
  const location = useLocation();
  const [chatHistory, setChatHistory] = useState([]);

  // Kiểm tra xem có đang ở trang Workspace không
  const isWorkspace = location.pathname.includes('/workspace');
  
  // Lấy tên file đang mở hiện tại từ URL để làm hiệu ứng "bôi đậm"
  const queryParams = new URLSearchParams(location.search);
  const currentActiveFile = queryParams.get('file');

  // Gọi API lấy danh sách tài liệu (chỉ gọi khi ở trang Workspace để tiết kiệm tài nguyên)
  useEffect(() => {
    if (isWorkspace) {
      const fetchHistory = async () => {
        try {
          const response = await fetch('http://localhost:8000/api/documents');
          if (response.ok) {
            const data = await response.json();
            setChatHistory(data);
          }
        } catch (error) {
          console.error("Lỗi khi tải lịch sử Sidebar:", error);
        }
      };
      fetchHistory();
    }
  }, [isWorkspace]);

  // ==========================================
  // GIAO DIỆN 1: DÀNH CHO DASHBOARD (THU GỌN)
  // ==========================================
  if (!isWorkspace) {
    return (
      <div className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-6 justify-between z-10 shadow-sm h-screen sticky top-0">
        <div className="flex flex-col gap-8 items-center w-full">
          <div className="bg-[#6B46C1] text-white p-2 rounded-xl font-bold text-xl cursor-pointer hover:bg-[#5a3aa3] transition shadow-md">
            AI
          </div>
          <nav className="flex flex-col gap-4 w-full px-3">
            <Link 
              to="/dashboard" 
              className={`p-3 rounded-xl transition flex justify-center group relative ${
                location.pathname === '/dashboard' ? 'bg-[#F3F0FF] text-[#6B46C1] shadow-inner' : 'text-gray-400 hover:bg-purple-50 hover:text-[#6B46C1]'
              }`}
            >
              <FiHome size={22} />
            </Link>
            
            <Link 
              to="/workspace" 
              className={`p-3 rounded-xl transition flex justify-center group relative ${
                location.pathname.includes('/workspace') ? 'bg-[#F3F0FF] text-[#6B46C1] shadow-inner' : 'text-gray-400 hover:bg-purple-50 hover:text-[#6B46C1]'
              }`}
            >
              <FiGrid size={22} />
            </Link>

            <button className="p-3 text-gray-400 hover:bg-gray-50 rounded-xl transition flex justify-center"><FiClock size={22} /></button>
            <button className="p-3 text-gray-400 hover:bg-gray-50 rounded-xl transition flex justify-center"><FiSettings size={22} /></button>
          </nav>
        </div>
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white shadow-sm cursor-pointer">
          L
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 2: DÀNH CHO WORKSPACE (MỞ RỘNG NHƯ GEMINI)
  // ==========================================
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-10 shadow-sm">
      {/* PHẦN LOGO */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
        <div className="bg-[#6B46C1] text-white p-2 rounded-xl font-bold text-xl cursor-pointer shadow-md">
          AI
        </div>
        <span className="font-black text-lg text-gray-800 tracking-tight">SmartLib</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
        {/* MENU CHÍNH */}
        <div>
          <div className="space-y-1">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-[#6B46C1] transition-colors"
            >
              <FiHome size={20} /> Dashboard
            </Link>
            
            {/* Trỏ về Dashboard để có không gian Upload */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-[#6B46C1] transition-colors"
            >
              <FiPlus size={20} /> New Document
            </Link>
          </div>
        </div>

        {/* LỊCH SỬ CHAT */}
        <div className="flex-1">
          <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Chats</p>
          <div className="space-y-1">
            {chatHistory.length === 0 ? (
              <p className="px-3 text-xs text-gray-400 italic">Chưa có lịch sử...</p>
            ) : (
              chatHistory.map((doc) => {
                const isActive = currentActiveFile === doc.filename;
                return (
                  <Link 
                    key={doc._id}
                    to={`/workspace?file=${encodeURIComponent(doc.filename)}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive 
                        ? 'bg-[#6B46C1] text-white shadow-md' 
                        : 'text-gray-600 hover:bg-purple-50 hover:text-[#6B46C1]'
                    }`}
                  >
                    <FiMessageSquare size={16} className={isActive ? 'text-purple-200' : 'text-gray-400 group-hover:text-[#6B46C1]'} />
                    <span className="truncate w-full" title={doc.filename}>
                      {doc.filename.replace('.pdf', '')}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition flex justify-center">
          <FiSettings size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">
          L
        </div>
      </div>
    </div>
  );
};

export default Sidebar;