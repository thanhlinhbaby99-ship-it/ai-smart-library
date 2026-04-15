import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import { 
  FiSearch, FiBell, FiPlus, FiFileText, FiTrendingUp, FiArrowRight, FiClock
} from 'react-icons/fi';
import { 
  BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis
} from 'recharts';

const Dashboard = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // State lưu dữ liệu thực từ MongoDB
  const [documents, setDocuments] = useState([]);
  const [docChartData, setDocChartData] = useState([]);
  
  // State mới cho biểu đồ Thời gian đọc (Reading Time)
  const [timeChartData, setTimeChartData] = useState([]);
  const [totalReadTimeFormatted, setTotalReadTimeFormatted] = useState("0h 0m");

  // Hàm gọi API lấy danh sách file
  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        processChartData(data);
        processReadTimeData(data); // Gọi thêm hàm xử lý dữ liệu thời gian
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tài liệu:", error);
    }
  };

  // Hàm tính toán biểu đồ theo ngày trong tuần từ dữ liệu thực
  const processChartData = (docs) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataTemplate = [
      { name: 'Mon', count: 0 }, { name: 'Tue', count: 0 }, { name: 'Wed', count: 0 },
      { name: 'Thu', count: 0 }, { name: 'Fri', count: 0 }, { name: 'Sat', count: 0 }, { name: 'Sun', count: 0 }
    ];

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

  // Hàm tính tổng thời gian đọc và chuẩn bị dữ liệu cho biểu đồ LineChart
  const processReadTimeData = (docs) => {
    // 1. Tính tổng thời gian đọc của tất cả tài liệu
    const totalSeconds = docs.reduce((acc, doc) => acc + (doc.read_time_seconds || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    setTotalReadTimeFormatted(`${hours}h ${minutes}m`);

    // 2. Lấy tối đa 7 tài liệu mới nhất, đổi số giây thành phút để vẽ biểu đồ
    const recentDocsForChart = [...docs].slice(0, 7).reverse().map(doc => ({
      name: doc.filename.length > 8 ? doc.filename.substring(0, 8) + '...' : doc.filename,
      minutes: parseFloat(((doc.read_time_seconds || 0) / 60).toFixed(1)) 
    }));
    
    // Nếu chưa có dữ liệu thì set mảng mặc định để chart không bị lỗi crash
    setTimeChartData(recentDocsForChart.length > 0 ? recentDocsForChart : [{ name: 'Chưa có', minutes: 0 }]);
  };

  // Chạy lần đầu khi mở trang
  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploadStatus('Đang tải lên và chờ AI quét nhanh...'); 
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (response.ok && data.ai_keywords) {
        setUploadStatus('AI phân tích thành công!');
        
        // Gọi lại hàm lấy tài liệu để danh sách tự cập nhật
        fetchDocuments();

        setTimeout(() => {
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setUploadStatus('');
        }, 1500); 
      } else {
        setUploadStatus('Lỗi: AI chưa trả về được kết quả!');
      }
    } catch (error) {
      setUploadStatus('Lỗi kết nối đến server!');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-gray-800">
      
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8">
          <div className="relative w-96">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search documents, topics..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border-none rounded-xl focus:ring-2 focus:ring-[#6B46C1] outline-none"
            />
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm shadow-purple-200"
            >
              <FiPlus size={20} /> Upload Document
            </button>
            <button className="text-gray-400 hover:text-gray-600 relative">
              <FiBell size={24} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold border-2 border-white shadow-sm cursor-pointer">L</div>
          </div>
        </header>

        {/* DASHBOARD WIDGETS */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Welcome back, Long! 👋</h2>
            <p className="text-gray-500 mt-1">Here is what's happening with your documents today.</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* CARD 1: TOTAL DOCUMENTS (Live Data) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-56 relative group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Total Documents</p>
                  <h3 className="text-3xl font-bold text-gray-800">{documents.length}</h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiFileText size={20} /></div>
              </div>
              <div className="h-24 w-full mt-4 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={docChartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                    <Tooltip cursor={{fill: '#F3F0FF'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 4, 4]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CARD 2: READING TIME (Live Data) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-56">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Reading Time</p>
                  <h3 className="text-3xl font-bold text-gray-800">{totalReadTimeFormatted}</h3>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FiClock size={20} /></div>
              </div>
              <div className="h-24 w-full mt-4 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeChartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={10} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => [`${value} phút`, 'Thời gian đọc']} />
                    <Line type="monotone" dataKey="minutes" stroke="#6B46C1" strokeWidth={3} dot={{ r: 4, fill: '#6B46C1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
              
            {/* CARD 3: PROGRESS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-56">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Research Progress</p>
                  <h3 className="text-xl font-bold text-gray-800 truncate w-32" title="Data Mining Proj.">Data Mining...</h3>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FiTrendingUp size={20} /></div>
              </div>
              
              <div className="flex-1 w-full flex items-center justify-center mt-2">
                <div className="relative w-[160px] h-[120px]">
                    <div className="absolute top-0 left-0 w-[75px] h-[75px] bg-[#6B46C1] border-2 border-white rounded-full flex flex-col items-center justify-center text-white shadow-sm z-10 hover:z-40 hover:scale-110 transition-all cursor-default">
                        <span className="font-bold text-lg leading-none">85%</span>
                        <span className="text-[8px] text-center leading-tight px-1 mt-0.5">AI APA Cited</span>
                    </div>
                    <div className="absolute bottom-0 left-3 w-[80px] h-[80px] bg-[#06B6D4] border-2 border-white rounded-full flex flex-col items-center justify-center text-white shadow-sm z-20 hover:z-40 hover:scale-110 transition-all cursor-default">
                        <span className="font-bold text-xl leading-none">92%</span>
                        <span className="text-[9px] text-center leading-tight px-1 mt-0.5">AI Summarized</span>
                    </div>
                    <div className="absolute top-2 right-0 w-[90px] h-[90px] bg-[#F97316] border-2 border-white rounded-full flex flex-col items-center justify-center text-white shadow-sm z-30 hover:z-40 hover:scale-110 transition-all cursor-default">
                        <span className="font-bold text-2xl leading-none">85%</span>
                        <span className="text-[10px] text-center leading-tight px-2 mt-1">Documents Read</span>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT DOCUMENTS (Live Data) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Recent Documents</h3>
              <button className="text-sm font-medium text-[#6B46C1] hover:underline">View All</button>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-100 rounded-xl">
                <FiFileText size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No documents yet. Click "Upload Document" to start checking!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                        <FiFileText size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg mb-1 truncate w-96">{doc.filename}</h4>
                        <div className="flex flex-wrap gap-2">
                          {doc.keywords && doc.keywords.split(',').map((kw, idx) => (
                            <span key={idx} className="px-3 py-1 bg-[#F3F0FF] text-[#6B46C1] text-xs font-bold rounded-full border border-purple-100">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      to={`/workspace?file=${encodeURIComponent(doc.filename)}`} 
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                    >
                      Mở trong Workspace <FiArrowRight />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-[500px] shadow-2xl relative">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
            >✕</button>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Upload Document</h2>
            <p className="text-gray-500 text-sm mb-6">Upload your file to extract keywords and start research.</p>
            
            <form 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors relative
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-[#6B46C1] bg-[#F3F0FF]'}`}
            >
              <input type="file" id="file-upload" className="hidden" onChange={handleChange} accept=".pdf,.doc,.docx,.txt" />
              
              {!selectedFile ? (
                <>
                  <FiFileText size={32} className="text-[#6B46C1] mb-2" />
                  <p className="text-gray-600 font-medium text-center px-4">
                    Kéo thả file tài liệu vào đây <br/> hoặc <label htmlFor="file-upload" className="text-[#6B46C1] cursor-pointer hover:underline ml-1">chọn từ máy tính</label>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Hỗ trợ PDF, DOCX, TXT (Tối đa 10MB)</p>
                </>
              ) : (
                <div className="text-center">
                  <FiFileText size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="text-gray-800 font-medium truncate w-64">{selectedFile.name}</p>
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 text-sm mt-2 hover:underline">Hủy chọn</button>
                </div>
              )}
            </form>

            <div className="mt-6 flex flex-col items-center">
              <button 
                onClick={handleUploadSubmit}
                disabled={!selectedFile || uploadStatus.includes('Đang tải')}
                className={`w-full py-3 rounded-xl font-bold transition shadow-md
                  ${selectedFile && !uploadStatus.includes('Đang tải') ? 'bg-[#6B46C1] text-white hover:bg-[#5a3aa3]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >Tiến hành quét</button>
              {uploadStatus && (
                <p className={`mt-3 text-sm font-medium ${uploadStatus.includes('thành công') ? 'text-green-600' : 'text-[#6B46C1]'}`}>
                  {uploadStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;