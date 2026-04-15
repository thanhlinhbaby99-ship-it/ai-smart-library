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
  const [messages, setMessages] = useState([]);

  const [pdfUrl, setPdfUrl] = useState("https://pdfobject.com/pdf/sample.pdf"); 
  const [currentFilename, setCurrentFilename] = useState("Tutorial09.pdf");

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // ==========================================
  // 1. LẤY FILE TỪ URL & LOAD LỊCH SỬ CHAT
  // ==========================================
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fileFromUrl = queryParams.get('file');

    const fetchHistoryAndSetup = async (fileName) => {
      setCurrentFilename(fileName);
      setPdfUrl(`http://localhost:8000/uploads/${fileName}`);
      setLoading(true);

      try {
        // Gọi API lấy lịch sử chat từ MongoDB
        const res = await fetch(`http://localhost:8000/api/chat-history/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            // Nếu có lịch sử, load thẳng vào khung chat
            setMessages(history);
          } else {
            // Nếu là file mới tinh chưa chat bao giờ
            setMessages([{
              role: 'ai',
              text: `Bi đã nhận được file **${fileName}** từ Dashboard. Cậu có thể bắt đầu hỏi được rồi nhé! 🚀`
            }]);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải lịch sử chat:", error);
      } finally {
        setLoading(false);
      }
    };

    if (fileFromUrl) {
      fetchHistoryAndSetup(decodeURIComponent(fileFromUrl));
    } else {
      setMessages([{
        role: 'ai',
        text: 'Chào Long! Bi đã sẵn sàng. Cậu hãy chọn tài liệu và bắt đầu đặt câu hỏi nhé!'
      }]);
    }
  }, [location.search]);

  // ==========================================
  // 🌟 TIME TRACKER - BỘ ĐẾM GIỜ THÔNG MINH 🌟
  // ==========================================
  useEffect(() => {
    if (!currentFilename || currentFilename === "Tutorial09.pdf") return;

    let isTracking = true;
    let startTime = Date.now();
    let totalReadTime = 0;

    // Hàm cộng dồn thời gian
    const accumulateTime = () => {
      if (isTracking) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        totalReadTime += timeSpent;
      }
    };

    // Bắt sự kiện người dùng chuyển tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        accumulateTime();
        isTracking = false; // Dừng đếm
      } else {
        startTime = Date.now();
        isTracking = true; // Đếm lại
      }
    };

    // Hàm gửi API về server
    const sendTimeToServer = async (timeInSeconds) => {
      if (timeInSeconds < 5) return; // Đọc dưới 5s không tính
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
        console.log(`⏱️ [Time Tracker] Đã lưu ${timeInSeconds}s cho file: ${currentFilename}`);
      } catch (error) {
        console.error("Lỗi khi lưu thời gian đọc:", error);
      }
    };

    // Bắt sự kiện khi user tắt hẳn trình duyệt
    const handleBeforeUnload = () => {
      accumulateTime();
      // Dùng keepalive để đảm bảo request vẫn bay đi dù trình duyệt đang đóng
      fetch("http://localhost:8000/api/update-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: encodeURIComponent(currentFilename),
            reading_time_added: totalReadTime,
            plagiarism_check_added: 0
          }),
          keepalive: true 
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup: Chạy khi đổi file hoặc rời khỏi trang Workspace
    return () => {
      accumulateTime();
      if (totalReadTime > 0) {
          sendTimeToServer(totalReadTime);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentFilename]); // Hook này sẽ chạy lại mỗi khi currentFilename thay đổi
  // ==========================================


  // 2. ĐỔI TÀI LIỆU
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessages([{ role: 'ai', text: `Đang tải file **${file.name}** lên Server, Long đợi một chút nhé...` }]);
    setLoading(true);

    const localUrl = URL.createObjectURL(file);
    setPdfUrl(localUrl);
    
    // Khi set file mới, useEffect của TimeTracker phía trên sẽ tự động chốt sổ file cũ và đếm lại file mới!
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

  // 4. KIỂM TRA ĐẠO VĂN (SMART CHECK - GỬI TOÀN BỘ LỊCH SỬ CHAT)
  const handleSmartCheck = async () => {
    setChecking(true);
    setShowCheckModal(true);
    try {
      const response = await fetch('http://localhost:8000/api/research-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_history: JSON.stringify(messages),
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
                      <p className="text-[10px] text-green-500 font-medium">{loading ? "Đang xử lý..." : "Trực tuyến"}</p>
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
              {loading && <div className="text-gray-400 text-xs italic animate-pulse">Bi đang xử lý, chờ xíu nhé...</div>}
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
            {/* Header Modal */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
              <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <FiShield className="text-indigo-600" /> AI Research Guard Analysis
              </h3>
              <button onClick={() => setShowCheckModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">✕</button>
            </div>

            <div className="p-8">
              {checking ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Bi đang đối soát dữ liệu với tài liệu...</p>
                </div>
              ) : checkResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      {/* Cột 1: Similarity Score */}
                      <div className={`p-6 rounded-3xl border ${
                        parseInt(checkResult.similarity) > 50 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                      }`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                            parseInt(checkResult.similarity) > 50 ? 'text-red-600' : 'text-green-600'
                          }`}>Similarity Score</p>
                          <p className={`text-5xl font-black ${
                            parseInt(checkResult.similarity) > 50 ? 'text-red-600' : 'text-green-600'
                          }`}>{checkResult.similarity}</p>
                          <p className="text-xs text-gray-600 mt-3 font-medium leading-relaxed italic">
                            "{checkResult.feedback}"
                          </p>
                      </div>

                      {/* Cột 2: Smart Rewrites */}
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">AI Suggestions (Nâng cấp & Trích dẫn)</p>
                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                             {checkResult.rewrites && checkResult.rewrites.map((r, i) => (
                               <div key={i} className="group relative">
                                  <p className="text-[11px] text-blue-900 bg-white/80 p-3 rounded-xl border border-blue-200/50 hover:border-blue-400 transition cursor-pointer">
                                    "{r}"
                                  </p>
                               </div>
                             ))}
                          </div>
                      </div>
                  </div>

                  {/* Next Steps Box */}
                  <div className="bg-[#1E1B4B] p-6 rounded-[24px] text-white shadow-xl relative overflow-hidden">
                      <FiCpu className="absolute -right-4 -top-4 text-white/10 w-24 h-24 rotate-12" />
                      <p className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                        Gợi ý nghiên cứu:
                      </p>
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {checkResult.next_steps}
                      </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setShowCheckModal(false)}
                      className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition"
                    >
                      Đóng
                    </button>
                    <button 
                      onClick={() => {
                        if (checkResult.rewrites && checkResult.rewrites.length > 0) {
                          setChatInput(checkResult.rewrites[0]);
                          setShowCheckModal(false);
                        }
                      }}
                      className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition"
                    >
                      Đưa gợi ý vào khung Chat
                    </button>
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