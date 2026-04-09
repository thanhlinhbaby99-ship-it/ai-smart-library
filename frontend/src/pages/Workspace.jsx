import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  FiSend, FiFileText, FiDownload, FiChevronLeft, FiShield, FiCpu, FiUploadCloud
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

// Thư viện xem PDF
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const Workspace = () => {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]); // Để trống ban đầu để useEffect tự quyết định

  const [pdfUrl, setPdfUrl] = useState("https://pdfobject.com/pdf/sample.pdf"); 
  const [currentFilename, setCurrentFilename] = useState("Tutorial09.pdf");

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // 1. LẤY FILE TỪ DASHBOARD (CHỈ HIỆN 1 CÂU CHÀO DUY NHẤT)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fileFromUrl = queryParams.get('file');

    if (fileFromUrl) {
      const fileName = decodeURIComponent(fileFromUrl);
      setCurrentFilename(fileName);
      setPdfUrl(`http://localhost:8000/uploads/${fileName}`);
      setMessages([{
        role: 'ai',
        text: `Bi đã nhận được file **${fileName}** từ Dashboard. Cậu có thể bắt đầu hỏi được rồi nhé! 🚀`
      }]);
    } else {
      setMessages([{
        role: 'ai',
        text: 'Chào Long! Bi đã sẵn sàng. Cậu hãy chọn tài liệu và bắt đầu đặt câu hỏi nhé!'
      }]);
    }
  }, [location.search]);

  // 2. ĐỔI TÀI LIỆU TRỰC TIẾP TẠI WORKSPACE
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessages([{ role: 'ai', text: `Đang tải file **${file.name}** lên Server, Long đợi một chút nhé...` }]);
    setLoading(true);

    const localUrl = URL.createObjectURL(file);
    setPdfUrl(localUrl);
    setCurrentFilename(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentFilename(data.filename); 
        setMessages([{ role: 'ai', text: `Bi đã đọc xong file **${data.filename}**. Giờ Bi chỉ tập trung vào tài liệu này thôi, cậu hỏi đi! 🎯` }]);
      }
    } catch (err) {
      setMessages([{ role: 'ai', text: "Lỗi đồng bộ file với Server Python!" }]);
    } finally {
      setLoading(false);
    }
  };

  // 3. CHAT VỚI AI
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;
    
    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          filename: encodeURIComponent(currentFilename) 
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "Lỗi Backend: " + data.detail }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Lỗi kết nối server!" }]);
    } finally {
      setLoading(false);
    }
  };

  // 4. KIỂM TRA ĐẠO VĂN
  const handleSmartCheck = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) {
        alert("Cậu nhắn gì đó vào chat trước đã!");
        return;
    }
    setChecking(true);
    setShowCheckModal(true);
    try {
      const response = await fetch('http://localhost:8000/api/research-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_text: lastUserMsg.text, 
          filename: encodeURIComponent(currentFilename) 
        }),
      });
      const data = await response.json();
      if (response.ok) {
          setCheckResult(data);
      } else {
          alert("Lỗi từ server: " + data.detail);
          setShowCheckModal(false);
      }
    } catch (err) {
      alert("Lỗi check đạo văn! Có thể do mạng đang quá tải.");
      setShowCheckModal(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-gray-800 overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-[#6B46C1] flex items-center gap-1 text-sm transition">
              <FiChevronLeft size={20} /> Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2 font-bold italic text-[#6B46C1]">
              <FiFileText size={20} /> {currentFilename}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition shadow-sm">
                <FiUploadCloud size={16} /> Đổi tài liệu
            </button>
            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"><FiDownload size={18} /></button>
          </div>
        </header>

        <div className="flex-1 flex gap-6 p-6 bg-[#F8FAFC] overflow-hidden">
          <div className="w-3/5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance]} />
                </Worker>
            </div>
          </div>

          <div className="w-2/5 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6B46C1] flex items-center justify-center text-white font-bold text-xs shadow-md">AI</div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">Gemini Assistant</h3>
                      <p className="text-[10px] text-green-500 font-medium">{loading ? "Đang xử lý tài liệu lớn..." : "Trực tuyến"}</p>
                    </div>
                </div>
                <button onClick={handleSmartCheck} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6B46C1] rounded-lg text-[11px] font-bold border border-purple-100 hover:bg-purple-100 transition shadow-sm">
                    <FiShield size={14} /> Smart Check
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-32 scroll-smooth">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-[#6B46C1] text-white rounded-br-none' : 'bg-[#F8FAFC] text-gray-700 rounded-tl-none border border-gray-100'
                  }`}>
                    <div className="prose prose-sm max-w-none text-inherit markdown-container">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && <div className="text-gray-400 text-xs italic animate-pulse">Bi đang đọc tài liệu, chờ xíu nhé...</div>}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 absolute bottom-0 w-full z-10 shadow-sm">
              <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#F8FAFC] border border-gray-200 rounded-xl overflow-hidden shadow-inner">
                <input 
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hỏi AI về tài liệu này..." 
                  className="w-full bg-transparent pl-4 pr-12 py-4 focus:outline-none text-sm"
                />
                <button type="submit" disabled={!chatInput.trim() || loading} className={`absolute right-2 p-2.5 rounded-lg transition ${chatInput.trim() && !loading ? 'bg-[#6B46C1] text-white hover:bg-[#5a3aa3]' : 'bg-gray-100 text-gray-400'}`}>
                  <FiSend size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {showCheckModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">🛡️ AI Research Guard</h3>
              <button onClick={() => setShowCheckModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
            </div>
            <div className="p-8">
              {checking ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-[#6B46C1] rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium text-center">Đang nạp file lên Gemini để soi đạo văn...<br/><span className="text-sm">Quá trình này có thể mất 10-20 giây.</span></p>
                </div>
              ) : checkResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Độ tương đồng</p>
                          <p className="text-5xl font-black text-orange-600">{checkResult.similarity}</p>
                          <p className="text-xs text-orange-800 mt-3 font-medium leading-relaxed italic">"{checkResult.feedback}"</p>
                      </div>
                      <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Đề xuất viết lại</p>
                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
                             {checkResult.rewrites && checkResult.rewrites.map((r, i) => (
                               <p key={i} className="text-[11px] text-blue-900 bg-white/60 p-2 rounded-lg border border-blue-100/50">"{r}"</p>
                             ))}
                          </div>
                      </div>
                  </div>
                  <div className="bg-[#1E1B4B] p-6 rounded-[24px] text-white shadow-xl relative overflow-hidden group">
                      <FiCpu className="absolute -right-4 -top-4 text-white/10 w-24 h-24 rotate-12" />
                      <p className="text-xs font-bold text-purple-300 mb-3 flex items-center gap-2">Gợi ý từ AI:</p>
                      <p className="text-sm text-gray-200 leading-relaxed italic">"{checkResult.next_steps}"</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowCheckModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition">Đóng</button>
                    <button className="flex-[2] py-4 bg-[#6B46C1] text-white font-bold rounded-2xl shadow-lg hover:bg-[#5a3aa3] transition shadow-purple-100">Áp dụng viết lại</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;