import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiClock, FiSettings } from 'react-icons/fi';

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

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
              isActive('/dashboard') ? 'bg-[#F3F0FF] text-[#6B46C1] shadow-inner' : 'text-gray-400 hover:bg-purple-50 hover:text-[#6B46C1]'
            }`}
          >
            <FiHome size={22} />
          </Link>
          
          <Link 
            to="/workspace" 
            className={`p-3 rounded-xl transition flex justify-center group relative ${
              isActive('/workspace') ? 'bg-[#F3F0FF] text-[#6B46C1] shadow-inner' : 'text-gray-400 hover:bg-purple-50 hover:text-[#6B46C1]'
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
};

export default Sidebar;