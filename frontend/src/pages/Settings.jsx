import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiMonitor, FiCpu, FiBell, FiSearch, FiSettings, FiType } from 'react-icons/fi';

const Settings = ({ currentTheme, onChangeTheme, currentLang, onChangeLang, t }) => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('appearance');
  const [settings, setSettings] = useState({ accent: 'purple', botModel: 'pro', emailNotif: true });
  const [saveMessage, setSaveMessage] = useState('');

  const isDark = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const themeClass = isDark ? 'bg-slate-900 text-white' : 'bg-[#F8FAFC] text-gray-800';
  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/api/my-profile', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.settings) {
          onChangeTheme(data.settings.theme || 'light');
          onChangeLang(data.settings.lang || 'vi');
          setSettings({ accent: data.settings.accent, botModel: data.settings.bot_model, emailNotif: data.settings.email_notif });
        }
      } catch (e) { console.error(e); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const res = await fetch('http://localhost:8000/api/settings', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: currentTheme, lang: currentLang, ...settings, bot_model: settings.botModel, email_notif: settings.emailNotif })
    });
    setSaveMessage(res.ok ? t.saveSuccess : t.saveError);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className={`flex h-screen font-sans transition-all duration-300 ${themeClass}`}>
      <Sidebar t={t} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-20 border-b flex items-center justify-between px-8 shrink-0 ${cardClass}`}>
          <div className="flex items-center gap-4">
            <button onClick={handleSave} className="px-5 py-2 bg-[#6B46C1] text-white text-sm font-bold rounded-xl shadow-md hover:opacity-90">{t.saveChanges}</button>
            <span className="text-sm font-bold text-green-500">{saveMessage}</span>
          </div>
          <div className="flex items-center gap-6">
            <FiBell size={24} className="text-gray-400" />
            <div onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold cursor-pointer">L</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-5xl mx-auto flex gap-16">
            <div className="w-64 shrink-0">
              <h1 className="text-2xl font-bold mb-8">{t.settings}</h1>
              <div className="space-y-1">
                <button onClick={() => setActiveMenu('appearance')} className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl ${activeMenu === 'appearance' ? 'bg-[#F3F0FF] text-[#6B46C1]' : 'text-gray-400'}`}><FiMonitor/> {t.appearance}</button>
                <button onClick={() => setActiveMenu('language')} className={`w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl ${activeMenu === 'language' ? 'bg-[#F3F0FF] text-[#6B46C1]' : 'text-gray-400'}`}><FiType/> {t.language}</button>
              </div>
            </div>

            <div className="flex-1">
              {activeMenu === 'appearance' && (
                <div className="space-y-12">
                  <section>
                    <h3 className="text-xs font-bold uppercase mb-6 text-gray-400">{t.colorMode}</h3>
                    <div className="grid grid-cols-3 gap-6">
                      {['light', 'dark', 'auto'].map(m => (
                        <div key={m} onClick={() => onChangeTheme(m)} className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${currentTheme === m ? 'border-[#6B46C1] scale-105' : 'border-transparent bg-gray-100/5'}`}>
                          <div className={`w-full h-16 rounded-lg ${m === 'dark' ? 'bg-slate-800' : 'bg-gray-200'}`} />
                          <span className="text-sm font-bold capitalize">{t[m]}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeMenu === 'language' && (
                <div className="max-w-md">
                  <h3 className="text-xs font-bold uppercase mb-6 text-gray-400">{t.language}</h3>
                  <select 
                    value={currentLang} 
                    onChange={(e) => onChangeLang(e.target.value)}
                    className={`w-full p-3 border rounded-xl outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;