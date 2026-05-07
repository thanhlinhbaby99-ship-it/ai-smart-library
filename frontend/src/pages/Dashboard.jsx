import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import { 
  FiSearch, FiBell, FiPlus, FiFileText, FiTrendingUp, FiArrowRight, FiClock, FiUploadCloud
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis
} from 'recharts';

const Dashboard = ({ t }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);

  // 🌟 THÊM USEREF ĐỂ CLICK CHỌN FILE
  const fileInputRef = useRef(null);

  const initialChartData = [
    { name: 'Mon', count: 0 }, { name: 'Tue', count: 0 }, { name: 'Wed', count: 0 },
    { name: 'Thu', count: 0 }, { name: 'Fri', count: 0 }, { name: 'Sat', count: 0 }, { name: 'Sun', count: 0 }
  ];
  const [docChartData, setDocChartData] = useState(initialChartData);
  const [timeChartData, setTimeChartData] = useState([{ name: 'N/A', minutes: 0 }]);
  const [totalReadTimeFormatted, setTotalReadTimeFormatted] = useState("0h 0m");

  const navigate = useNavigate();

  if (!t) return null;

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        processChartData(data);
        processReadTimeData(data); 
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  };

  const processChartData = (docs) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataTemplate = JSON.parse(JSON.stringify(initialChartData));
    docs.forEach(doc => {
      if (doc.created_at) {
        const date = new Date(doc.created_at);
        const dayName = days[date.getDay()];
        const dayObj = dataTemplate.find(d => d.name === dayName);
        if (dayObj) dayObj.count += 1;
      }
    });
    setDocChartData(dataTemplate);
  };

  const processReadTimeData = (docs) => {
    const totalSeconds = docs.reduce((acc, doc) => acc + (doc.read_time_seconds || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    setTotalReadTimeFormatted(`${hours}h ${minutes}m`);
    const recentDocsForChart = [...docs].slice(0, 7).reverse().map(doc => ({
      name: doc.filename.length > 8 ? doc.filename.substring(0, 8) + '...' : doc.filename,
      minutes: parseFloat(((doc.read_time_seconds || 0) / 60).toFixed(1)) 
    }));
    setTimeChartData(recentDocsForChart.length > 0 ? recentDocsForChart : [{ name: 'Chưa có', minutes: 0 }]);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  };

  // 🌟 HÀM XỬ LÝ KHI CLICK CHỌN FILE
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploadStatus('Đang xử lý...'); 
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await fetch('http://localhost:8000/api/upload', { method: 'POST', body: formData });
      if (response.ok) {
        setUploadStatus(t.saveSuccess);
        fetchDocuments();
        setTimeout(() => { setIsUploadModalOpen(false); setSelectedFile(null); setUploadStatus(''); }, 1500); 
      }
    } catch (error) { setUploadStatus(t.saveError); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-900 font-sans text-gray-800 dark:text-white transition-colors duration-300">
      
      <Sidebar t={t} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-8 transition-colors">
          <div className="relative w-96">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={t.search} 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none dark:text-white"
            />
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white px-5 py-2.5 rounded-xl font-medium transition shadow-md"
            >
              <FiPlus size={20} /> {t.newDocument}
            </button>
            <FiBell size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" />
            <div 
              onClick={() => navigate('/profile')} 
              className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform"
            >L</div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">{t.welcome}, Long! 👋</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Hôm nay cậu muốn nghiên cứu tài liệu nào?</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* CARD 1: TOTAL DOCUMENTS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm h-64 flex flex-col justify-between transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Tài liệu đã quét</p>
                  <h3 className="text-4xl font-black mt-2">{documents.length}</h3>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><FiFileText size={24} /></div>
              </div>
              <div className="h-28 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={docChartData}>
                    <XAxis dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 4, 4]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CARD 2: READING TIME */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm h-64 flex flex-col justify-between transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Thời gian đọc</p>
                  <h3 className="text-4xl font-black mt-2">{totalReadTimeFormatted}</h3>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl"><FiClock size={24} /></div>
              </div>
              <div className="h-28 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeChartData}>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                    <Line type="monotone" dataKey="minutes" stroke="#6B46C1" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
              
            {/* CARD 3: PROGRESS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm h-64 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
              {documents.length > 0 ? (
                <>
                  <div className="flex justify-between items-start w-full mb-6">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Tiến độ nghiên cứu</p>
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-lg"><FiTrendingUp size={20} /></div>
                  </div>
                  <div className="flex gap-2 items-center justify-center">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">85%</div>
                    <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">92%</div>
                    <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">85%</div>
                  </div>
                </>
              ) : (
                <div className="text-center opacity-50">
                   <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiTrendingUp className="text-gray-400" size={32} />
                   </div>
                   <p className="text-sm text-gray-500 font-bold">Chưa có tiến độ</p>
                </div>
              )}
            </div>
          </div>

          {/* RECENT DOCUMENTS */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6">{t.recentChats}</h3>
            
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-2xl">
                <FiUploadCloud size={64} className="text-gray-300 dark:text-slate-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">Cậu chưa tải tài liệu nào lên cả...</p>
                <button 
                  onClick={() => setIsUploadModalOpen(true)} 
                  className="px-6 py-2 bg-purple-50 dark:bg-purple-900/30 text-[#6B46C1] dark:text-purple-400 font-bold rounded-xl hover:bg-purple-100 transition"
                >
                  Tải lên file đầu tiên!
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl hover:shadow-md transition">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl">
                        <FiFileText size={24} />
                      </div>
                      <span className="font-bold truncate w-64">{doc.filename}</span>
                    </div>
                    <Link to={`/workspace?file=${encodeURIComponent(doc.filename)}`} className="text-[#6B46C1] dark:text-purple-400 font-bold text-sm flex items-center gap-1 hover:underline">
                      Chi tiết <FiArrowRight />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL UPLOAD */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] transition-all">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] w-[500px] relative shadow-2xl">
            <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 font-bold">✕</button>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">{t.newDocument}</h2>
            
            {/* 🌟 VỪA KÉO THẢ, VỪA CLICK ĐƯỢC ĐỂ CHỌN FILE */}
            <div 
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDrag} onDrop={handleDrop}
              className={`h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer
                ${dragActive ? 'bg-purple-50 border-purple-500' : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              {/* 🌟 INPUT ẨN NHẬN ĐUÔI PDF & DOCX */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
                accept=".pdf,.docx" 
              />
              <FiUploadCloud size={48} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {selectedFile ? <span className="text-[#6B46C1]">{selectedFile.name}</span> : "Kéo thả hoặc Click để chọn (.pdf, .docx)"}
              </p>
            </div>

            <button 
              onClick={handleUploadSubmit} 
              className={`w-full mt-6 py-4 rounded-2xl font-bold transition-all shadow-md ${selectedFile ? 'bg-[#6B46C1] text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {t.saveChanges}
            </button>
            {uploadStatus && <p className="mt-4 text-center text-sm font-bold text-[#6B46C1] animate-pulse">{uploadStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;