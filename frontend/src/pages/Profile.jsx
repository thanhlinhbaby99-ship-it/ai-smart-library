import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import { FiUser, FiLock, FiLogOut, FiSearch, FiBell, FiSettings } from 'react-icons/fi';

// 🌟 NHẬN t TỪ APP.JSX
const Profile = ({ t }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account'); 
  const navigate = useNavigate();

  // --- STATE CHO ĐỔI MẬT KHẨU ---
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passMessage, setPassMessage] = useState('');

  // Nếu t chưa tới kịp thì dùng tạm dữ liệu tiếng Anh để không sập web
  const labels = t || {};

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token'); 
        if (!token) { navigate('/login'); return; }

        const response = await fetch('http://localhost:8000/api/my-profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error("Lỗi:", error);
      } finally { setLoading(false); }
    };
    fetchProfileData();
  }, [navigate]);

  const formatTime = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  // --- HÀM XỬ LÝ ĐỔI MẬT KHẨU ---
  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setPassMessage('Mật khẩu xác nhận không khớp!');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setPassMessage('✅ ' + data.message);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        setPassMessage('❌ ' + data.detail);
      }
    } catch (error) {
      setPassMessage('❌ Lỗi kết nối đến server!');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900 dark:text-white transition-colors">Đang tải...</div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-900 font-sans text-gray-800 dark:text-white transition-colors duration-300">
      
      {/* 🌟 TRUYỀN t CHO SIDEBAR ĐỂ KHÔNG BỊ MẤT */}
      <Sidebar t={t} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOPBAR */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-8 shrink-0 transition-colors">
          <div className="relative w-96">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={labels.search || "Search settings, topics..."} 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-900 dark:text-white border-none rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none text-sm transition-colors"
            />
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-[#6B46C1] dark:hover:text-purple-400 transition-colors" title={labels.settings || "Cài đặt"}>
              <FiSettings size={22} />
            </button>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 relative">
              <FiBell size={24} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </button>
            <div 
              className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 font-bold border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer hover:scale-105 transition-transform"
              title={labels.profile || "Profile"}
            >
              {profileData?.user_info?.username?.charAt(0).toUpperCase() || 'L'}
            </div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-10 transition-colors">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16">
            
            {/* MENU BÊN TRÁI */}
            <div className="w-64 flex-shrink-0">
              <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 bg-[#6B46C1] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {profileData?.user_info?.username?.charAt(0).toUpperCase() || 'L'}
                </div>
                <h2 className="mt-4 text-lg font-bold">{profileData?.user_info?.username || 'tahailong03'}</h2>
                <p className="text-xs text-gray-400">Hanu Researcher</p>
              </div>
              
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">{labels.settings || "Settings"}</p>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 font-bold rounded-xl transition ${activeTab === 'account' ? 'bg-[#F3F0FF] dark:bg-purple-900/30 text-[#6B46C1] dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <FiUser/> Account
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 font-bold rounded-xl transition ${activeTab === 'security' ? 'bg-[#F3F0FF] dark:bg-purple-900/30 text-[#6B46C1] dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <FiLock/> Security
                </button>
                
                <button onClick={() => {localStorage.clear(); navigate('/');}} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl mt-10 transition">
                  <FiLogOut/> {labels.logout || "Log out"}
                </button>
              </div>
            </div>

            {/* NỘI DUNG BÊN PHẢI */}
            <div className="flex-1">
              
              {/* TAB ACCOUNT */}
              {activeTab === 'account' && (
                <div className="animate-fade-in">
                  <h1 className="text-2xl font-bold">Account Information</h1>
                  <p className="text-gray-400 text-sm mb-10">Manage your login credentials and basic account details</p>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Login</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                        <div className="w-full max-w-md p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 transition-colors">
                          {profileData?.user_info?.email || 'thanhlinhbaby99@gmail.com'}
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Profile Details</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                          <div className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 transition-colors">
                            {profileData?.user_info?.username || 'tahailong03'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Joined</label>
                          <div className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium text-gray-700 dark:text-gray-200 transition-colors">
                            {profileData?.user_info?.created_at ? new Date(profileData.user_info.created_at).toLocaleDateString('vi-VN') : '31/3/2026'}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Research Statistics</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-2xl dark:bg-slate-800/50">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Documents Uploaded</p>
                          <p className="text-2xl font-black text-[#6B46C1] dark:text-purple-400">{profileData?.stats?.total_documents || 7}</p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-2xl dark:bg-slate-800/50">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Plagiarism Checks</p>
                          <p className="text-2xl font-black text-[#06B6D4]">{profileData?.stats?.total_plagiarism_checks || 4}</p>
                        </div>
                        <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-2xl dark:bg-slate-800/50">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Reading Time</p>
                          <p className="text-2xl font-black text-[#F97316]">{profileData?.stats ? formatTime(profileData.stats.total_read_time_seconds) : '14 phút'}</p>
                        </div>
                      </div>
                    </section>

                    <section className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex justify-between items-center mt-12 transition-colors">
                      <div>
                        <p className="font-bold text-red-600 dark:text-red-400 mb-0.5">Danger Zone</p>
                        <p className="text-xs text-red-400 dark:text-red-300">Permanently remove your account and all research data.</p>
                      </div>
                      <button className="px-5 py-2.5 bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 font-bold border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition shadow-sm">
                        Delete Account
                      </button>
                    </section>
                  </div>
                </div>
              )}

              {/* TAB SECURITY */}
              {activeTab === 'security' && (
                <div className="animate-fade-in">
                  <h1 className="text-2xl font-bold">Security Settings</h1>
                  <p className="text-gray-400 text-sm mb-10">Keep your account secure and manage your password</p>

                  <div className="space-y-8">
                    <section className="max-w-md">
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                          <input 
                            type="password" placeholder="••••••••" 
                            value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none transition dark:text-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                          <input 
                            type="password" placeholder="••••••••" 
                            value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none transition dark:text-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                          <input 
                            type="password" placeholder="••••••••" 
                            value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none transition dark:text-white" 
                          />
                        </div>

                        {/* HIỂN THỊ THÔNG BÁO */}
                        {passMessage && (
                          <p className={`text-sm font-bold ${passMessage.includes('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {passMessage}
                          </p>
                        )}

                        <button 
                          onClick={handleChangePassword}
                          disabled={!passwords.current || !passwords.new || !passwords.confirm}
                          className="w-full mt-2 py-3 bg-[#6B46C1] text-white font-bold rounded-xl hover:bg-[#5a3aa3] disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-gray-500 transition shadow-md"
                        >
                          Update Password
                        </button>
                      </div>
                    </section>

                    <hr className="border-gray-100 dark:border-slate-700 max-w-md my-8 transition-colors" />

                    <section className="max-w-md">
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Two-Factor Authentication</h3>
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-xl transition-colors">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">Use 2FA</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add an extra layer of security to your account.</p>
                        </div>
                        <div className="w-12 h-6 bg-gray-200 dark:bg-slate-600 rounded-full relative cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;