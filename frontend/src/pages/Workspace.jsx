import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  FiSend, FiFileText, FiDownload, FiChevronLeft, FiShield, FiCpu, FiUploadCloud
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const Workspace = ({ t }) => {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("https://pdfobject.com/pdf/sample.pdf"); 
  const [currentFilename, setCurrentFilename] = useState("Tutorial09.pdf");
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const isDark = document.documentElement.classList.contains('dark');

  // ==========================================
  // 1. LẤY FILE & LOAD LỊCH SỬ
  // ==========================================
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fileFromUrl = queryParams.get('file');

    const fetchHistoryAndSetup = async (fileName) => {
      setCurrentFilename(fileName);
      setPdfUrl(`http://localhost:8000/uploads/${fileName}`);
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/chat-history/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            setMessages([{ role: 'ai', text: `Bi đã nhận được file **${fileName}**. Cậu bắt đầu hỏi được rồi nhé! 🚀` }]);
          }
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    if (fileFromUrl) fetchHistoryAndSetup(decodeURIComponent(fileFromUrl));
  }, [location.search]);

  // ==========================================
  // 🌟 TIME TRACKER 
  // ==========================================
  useEffect(() => {
    if (!currentFilename || currentFilename === "Tutorial09.pdf") return;
    let startTime = Date.now();

    const sendTimeToServer = async (timeInSeconds) => {
      if (timeInSeconds < 5) return;
      try {
        await fetch("http://localhost:8000/api/update-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: encodeURIComponent(currentFilename),
            reading_time_added: timeInSeconds,
            plagiarism_check_added: 0
          })
        });
      } catch (error) { console.error(error); }
    };

    window.addEventListener("beforeunload", () => {
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      fetch("http://localhost:8000/api/update-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: encodeURIComponent(currentFilename), reading_time_added: totalTime, plagiarism_check_added: 0 }),
          keepalive: true 
      });
    });

    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      sendTimeToServer(timeSpent);
    };
  }, [currentFilename]);

  // ==========================================
  // 3. LOGIC CHAT & SMART CHECK
  // ==========================================
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
        body: JSON.stringify({ message: userMsg, filename: encodeURIComponent(currentFilename) }),
      });
      const data = await response.json();
      if (response.ok) setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSmartCheck = async () => {
    setChecking(true); 
    setShowCheckModal(true);
    setCheckResult(null); 
    try {
      const response = await fetch('http://localhost:8000/api/research-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_history: JSON.stringify(messages), filename: encodeURIComponent(currentFilename) }),
      });
      const data = await response.json();
      if (response.ok) {
        setCheckResult(data);
      } else {
        setCheckResult({ error: true, detail: data.detail || "Server bị quá tải hoặc tài liệu quá dài. Cậu thử lại sau nhé!" });
      }
    } catch (err) { 
      console.error(err); 
      setCheckResult({ error: true, detail: "Mất kết nối. Có thể tài liệu quá nặng khiến server bị timeout rồi!" });
    } finally { 
      setChecking(false); 
    }
  };

  if (!t) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      <Sidebar t={t} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-[#6B46C1] flex items-center gap-1 text-sm">
              <FiChevronLeft size={20} /> {t.dashboard}
            </Link>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-2 font-bold italic text-[#6B46C1] dark:text-purple-400">
              <FiFileText size={20} /> {currentFilename}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 🌟 ĐÃ MỞ RỘNG ACCEPT THÊM .DOCX */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={() => {}} accept=".pdf,.docx" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-800">
                <FiUploadCloud size={16} /> {t.changeDoc}
            </button>
            <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><FiDownload size={18} /></button>
          </div>
        </header>

        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* VIEW AREA */}
          <div className="w-3/5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col transition-colors relative">
            <div className="flex-1 overflow-auto absolute inset-0">
                {/* 🌟 KIỂM TRA ĐUÔI FILE ĐỂ TRÁNH CRASH */}
                {currentFilename?.toLowerCase().endsWith('.docx') ? (
                   <div className="flex flex-col items-center justify-center h-full bg-blue-50/50 dark:bg-slate-800">
                      <FiFileText size={80} className="text-blue-500 mb-6 drop-shadow-md" />
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Tài liệu Word đã sẵn sàng</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm px-4">
                        File .docx đang được Bi phân tích ngầm. Trình xem trước chỉ hỗ trợ PDF, nhưng cậu vẫn có thể trò chuyện và Smart Check bình thường ở khung bên cạnh nhé!
                      </p>
                   </div>
                ) : (
                   <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                       <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance]} theme={isDark ? 'dark' : 'light'} />
                   </Worker>
                )}
            </div>
          </div>

          {/* CHAT BOX */}
          <div className="w-2/5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6B46C1] flex items-center justify-center text-white font-bold text-xs shadow-md">AI</div>
                    <div>
                      <h3 className="font-bold text-sm dark:text-white">Gemini Assistant</h3>
                      <p className="text-[10px] text-green-500 font-medium">● {loading ? "..." : t.online}</p>
                    </div>
                </div>
                <button onClick={handleSmartCheck} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-[#6B46C1] dark:text-purple-400 rounded-lg text-[11px] font-bold border border-purple-100 dark:border-purple-800 shadow-sm">
                    <FiShield size={14} /> {t.smartCheck}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-32">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-[#6B46C1] text-white rounded-br-none' : 'bg-[#F8FAFC] dark:bg-slate-900 text-gray-700 dark:text-gray-300 rounded-tl-none border border-gray-100 dark:border-slate-800 transition-colors'
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-inherit">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && <div className="text-gray-400 text-xs italic animate-pulse">Bi đang xử lý...</div>}
            </div>
                
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 absolute bottom-0 w-full z-10 transition-colors">
              <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#F8FAFC] dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner transition-colors">
                <input 
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t.askPlaceholder} 
                  className="w-full bg-transparent pl-4 pr-12 py-4 focus:outline-none text-sm dark:text-white"
                />
                <button type="submit" className="absolute right-2 p-2.5 bg-[#6B46C1] text-white rounded-lg shadow-md"><FiSend size={18} /></button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 MODAL SMART CHECK */}
      {showCheckModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 transition-all">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden transition-colors flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <FiShield className="text-indigo-600 dark:text-indigo-400" /> {t.smartCheck} Analysis
              </h3>
              <button onClick={() => setShowCheckModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 transition">✕</button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
               {checking ? (
                 <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 border-4 border-indigo-200 border-t-[#6B46C1] rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Bi đang quét sâu toàn bộ dữ liệu... Cậu đợi xíu nhé!</p>
                 </div>
               ) : checkResult?.error ? (
                 <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                      <FiShield size={32} className="text-red-500" />
                    </div>
                    <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Phân tích thất bại</h4>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md">{checkResult.detail}</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                    {(() => {
                      const simScore = parseInt(checkResult?.similarity) || 0;
                      let scoreColor = "text-green-600 dark:text-green-400";
                      let scoreBg = "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800";
                      let statusText = "An toàn";

                      if (simScore > 50) {
                        scoreColor = "text-red-600 dark:text-red-400";
                        scoreBg = "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800";
                        statusText = "Nguy hiểm";
                      } else if (simScore > 20) {
                        scoreColor = "text-orange-600 dark:text-orange-400";
                        scoreBg = "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800";
                        statusText = "Cần chỉnh sửa";
                      }

                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className={`p-6 rounded-3xl border ${scoreBg} flex flex-col justify-center items-center text-center transition-colors`}>
                                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${scoreColor}`}>
                                    {t.similarityScore || "Tỉ lệ trùng lặp"}
                                  </p>
                                  <p className={`text-6xl font-black ${scoreColor}`}>
                                    {checkResult?.similarity || "0%"}
                                  </p>
                                  <span className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold border ${scoreColor} bg-white dark:bg-slate-800`}>
                                    {statusText}
                                  </span>
                              </div>

                              <div className="md:col-span-2 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 transition-colors">
                                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Đánh giá của AI</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {checkResult?.feedback || "Tài liệu này hiện tại khá ổn định. Tuy nhiên, cậu luôn cần kiểm tra lại các trích dẫn học thuật để đảm bảo tính minh bạch nhé."}
                                  </p>
                              </div>
                          </div>

                          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800 transition-colors">
                            <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4">
                              {t.suggestions || "Gợi ý nâng cấp"} (Bấm để copy)
                            </p>
                            <div className="space-y-3">
                              {checkResult?.rewrites?.length > 0 ? (
                                checkResult.rewrites.map((r, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => setChatInput(r)}
                                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition shadow-sm group"
                                  >
                                    <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-[#6B46C1] dark:group-hover:text-purple-400 transition-colors">
                                      "{r}"
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">AI không tìm thấy đoạn văn nào cần phải viết lại khẩn cấp.</p>
                              )}
                            </div>
                          </div>

                          <div className="bg-[#1E1B4B] dark:bg-[#0F172A] p-6 rounded-[24px] text-white shadow-xl relative overflow-hidden transition-colors">
                              <FiCpu className="absolute -right-4 -top-4 text-white/5 w-32 h-32 rotate-12" />
                              <p className="text-xs font-bold text-indigo-300 mb-3 flex items-center gap-2 relative z-10">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span> Bước đi tiếp theo dành cho cậu:
                              </p>
                              <p className="text-sm text-gray-200 leading-relaxed relative z-10">
                                {checkResult?.next_steps || "Hãy tập trung vào việc đọc thêm các tài liệu liên quan đến phương pháp nghiên cứu để củng cố lập luận cho phần này."}
                              </p>
                          </div>
                        </>
                      );
                    })()}
                 </div>
               )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 shrink-0 bg-gray-50 dark:bg-slate-800/50">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCheckModal(false)} 
                  className="flex-1 py-4 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition shadow-sm"
                >
                  {t.close || "Đóng"}
                </button>
                <button 
                  onClick={() => {
                    if (checkResult?.rewrites && checkResult.rewrites.length > 0) {
                      setChatInput(checkResult.rewrites[0]);
                      setShowCheckModal(false);
                    }
                  }}
                  disabled={checking || checkResult?.error}
                  className="flex-[2] py-4 bg-[#6B46C1] text-white font-bold rounded-2xl shadow-md hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 transition"
                >
                  {t.useSuggestion || "Đưa gợi ý vào khung Chat"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;