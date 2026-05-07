import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'; 
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Profile from './pages/Profile'; 
import Settings from './pages/Settings';
import { translations } from './utils/translations';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    localStorage.setItem('lang', lang);
  }, [theme, lang]);

  // 🌟 ĐỊNH NGHĨA t Ở ĐÂY (Nằm trước return)
  const t = translations[lang] || translations['vi'];

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login t={t} />} />
        <Route path="/dashboard" element={<Dashboard t={t} />} />
        <Route path="/workspace" element={<Workspace t={t} />} />
        <Route path="/profile" element={<Profile t={t} />} />
        <Route 
          path="/settings" 
          element={
            <Settings 
              currentTheme={theme} onChangeTheme={setTheme} 
              currentLang={lang} onChangeLang={setLang} t={t} 
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}