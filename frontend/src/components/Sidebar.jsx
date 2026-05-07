import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiGrid, FiSettings, FiPlus, FiMessageSquare } from 'react-icons/fi';

const Sidebar = ({ t }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState([]);

  // Từ điển dự phòng (nếu t bị mất kết nối)
  const dict = t || {
    dashboard: "Bảng điều khiển",
    newDocument: "Tài liệu mới",
    recentChats: "Gần đây",
    settings: "Cài đặt",
    profile: "Cá nhân",
    noHistory: "Chưa có..."
  };

  const isWorkspace = location.pathname.includes('/workspace');
  const queryParams = new URLSearchParams(location.search);
  const currentActiveFile = queryParams.get('file');

  useEffect(() => {
    if (isWorkspace) {
      fetch('http://localhost:8000/api/documents')
        .then(res => { if(res.ok) return res.json(); return []; })
        .then(data => setChatHistory(data))
        .catch(err => console.error(err));
    }
  }, [isWorkspace]);

  // Bộ class dùng chung cho Dark/Light Mode
  const commonBg = "bg-white dark:bg-slate-950";
  const commonBorder = "border-gray-100 dark:border-slate-800";
  const activeLink = "bg-[#F3F0FF] text-[#6B46C1] dark:bg-purple-900/30 dark:text-purple-400 shadow-sm";
  const hoverLink = "hover:bg-purple-50 hover:text-[#6B46C1] dark:hover:bg-slate-900 dark:hover:text-purple-400";

  // =====================================
  // GIAO DIỆN THU GỌN (DASHBOARD/PROFILE)
  // =====================================
  if (!isWorkspace) {
    return (
      // 🌟 THÊM shrink-0 Ở ĐÂY ĐỂ CHỐNG XẸP LÉP
      <div className={`w-20 ${commonBg} border-r ${commonBorder} flex flex-col items-center py-6 justify-between z-10 shadow-sm h-screen sticky top-0 transition-colors duration-300 shrink-0`}>
        <div className="flex flex-col gap-8 items-center w-full">
          <div className="bg-[#6B46C1] text-white p-2 rounded-xl font-bold text-xl shadow-md cursor-default">AI</div>
          <nav className="flex flex-col gap-4 w-full px-3">
            <Link to="/dashboard" title={dict.dashboard} className={`p-3 rounded-xl transition flex justify-center group ${location.pathname === '/dashboard' ? activeLink : `text-gray-400 ${hoverLink}`}`}><FiHome size={22} /></Link>
            <Link to="/workspace" title="Workspace" className={`p-3 rounded-xl transition flex justify-center group ${location.pathname.includes('/workspace') ? activeLink : `text-gray-400 ${hoverLink}`}`}><FiGrid size={22} /></Link>
            <button onClick={() => navigate('/settings')} title={dict.settings} className={`p-3 rounded-xl transition flex justify-center ${location.pathname === '/settings' ? activeLink : `text-gray-400 ${hoverLink}`}`}><FiSettings size={22} /></button>
          </nav>
        </div>
        <div onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:bg-orange-200 transition-colors" title={dict.profile}>L</div>
      </div>
    );
  }

  // =====================================
  // GIAO DIỆN MỞ RỘNG (WORKSPACE)
  // =====================================
  return (
    // 🌟 THÊM shrink-0 Ở ĐÂY ĐỂ CHỐNG XẸP LÉP
    <div className={`w-64 ${commonBg} border-r ${commonBorder} flex flex-col h-screen sticky top-0 z-10 shadow-sm transition-colors duration-300 shrink-0`}>
      <div className={`flex items-center gap-3 px-6 py-6 border-b ${commonBorder}`}>
        <div className="bg-[#6B46C1] text-white p-2 rounded-xl font-bold text-xl shadow-md">AI</div>
        <span className="font-black text-lg text-gray-800 dark:text-white tracking-tight">SmartLib</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
        <div className="space-y-1">
          <Link to="/dashboard" className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? activeLink : `text-gray-600 dark:text-slate-400 ${hoverLink}`}`}>
            <FiHome size={20} /> {dict.dashboard}
          </Link>
          <Link to="/dashboard" className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 transition-colors ${hoverLink}`}>
            <FiPlus size={20} /> {dict.newDocument}
          </Link>
        </div>

        <div className="flex-1">
          <p className="px-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">{dict.recentChats}</p>
          <div className="space-y-1">
            {chatHistory.length === 0 ? (
              <p className="px-3 text-xs text-gray-400 italic">{dict.noHistory}</p>
            ) : (
              chatHistory.map((doc) => {
                const isActive = currentActiveFile === doc.filename;
                return (
                  <Link key={doc._id} to={`/workspace?file=${encodeURIComponent(doc.filename)}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive ? 'bg-[#6B46C1] text-white shadow-md' : `text-gray-600 dark:text-slate-400 ${hoverLink}`}`}>
                    <FiMessageSquare size={16} className={isActive ? 'text-purple-200' : 'text-gray-400 group-hover:text-[#6B46C1] dark:group-hover:text-purple-400'} />
                    <span className="truncate w-full">{doc.filename.replace('.pdf', '')}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={`p-4 border-t ${commonBorder} flex items-center justify-between`}>
        <button onClick={() => navigate('/settings')} className={`p-2 text-gray-400 rounded-xl transition flex justify-center ${hoverLink}`} title={dict.settings}><FiSettings size={20} /></button>
        <div onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 hover:bg-orange-200 transition-all" title={dict.profile}>L</div>
      </div>
    </div>
  );
};

export default Sidebar;