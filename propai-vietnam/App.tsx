
import React, { useState, useEffect } from 'react';
import { AppState, PropertyInput, AnalysisResult, CustomerProfile, MatchResult, User, SavedDeal } from './types';
import { analyzeProperty, matchCustomer } from './services/geminiService';
import RiskRadar from './components/RiskRadar';
import ScoreGauge from './components/ScoreGauge';
import GroundingSources from './components/GroundingSources';
import MarketTrends from './components/MarketTrends';
import AuthModal from './components/AuthModal';
import UserDashboard from './components/UserDashboard';
import BulkAnalysis from './components/BulkAnalysis';

const INITIAL_PROPERTY: PropertyInput = {
  address: "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
  price: 25,
  area: 100,
  type: "Nhà phố thương mại",
  description: "Mặt tiền sầm uất, gần phố đi bộ, thích hợp kinh doanh F&B.",
  images: [],
  locationUrl: ""
};

const INITIAL_CUSTOMER: CustomerProfile = {
  budget: 20,
  purpose: "Đầu tư cho thuê",
  riskTolerance: "Medium",
  lifestyle: "Thích sự an toàn, dòng tiền ổn định"
};

const ADMIN_EMAIL = "anthonyquanglh@gmail.com";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [property, setProperty] = useState<PropertyInput>(INITIAL_PROPERTY);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile>(INITIAL_CUSTOMER);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string>("");
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Check Local Storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('propai_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (!parsedUser.history) parsedUser.history = [];
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('propai_user');
      }
    }
  }, []);

  // Update local storage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('propai_user', JSON.stringify(user));
    }
  }, [user]);

  const showToast = (message: string) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 4000);
  };

  // Centralized Mock Email Service
  const sendEmailToAdmin = (type: 'REGISTRATION' | 'ANALYSIS' | 'MATCHING' | 'BULK_ANALYSIS', data: any) => {
    const timestamp = new Date().toLocaleString('vi-VN');
    console.group(`📧 [MOCK EMAIL] SENDING TO: ${ADMIN_EMAIL}`);
    console.log(`Time: ${timestamp}`);
    console.log(`Type: ${type}`);
    console.log(`Data Payload:`, data);
    console.groupEnd();

    // In a real application, this would call an API endpoint:
    // await fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to: ADMIN_EMAIL, type, data }) });
  };

  const handleLogin = (newUser: User) => {
    // Preserve history if logging in with same email but different session logic
    const existingUserStr = localStorage.getItem('propai_user');
    let userToSet = newUser;

    if (existingUserStr) {
        try {
            const existing = JSON.parse(existingUserStr);
            if (existing.email === newUser.email) {
                userToSet = { ...newUser, history: existing.history || [] };
            }
        } catch(e) {}
    }

    setUser(userToSet);
    
    // Send Registration Data to Admin
    sendEmailToAdmin('REGISTRATION', {
      user: {
        name: userToSet.name,
        email: userToSet.email,
        phone: userToSet.phone,
        source: userToSet.id.startsWith('google') ? 'Google OAuth' : 'Web Form'
      }
    });

    setShowAuthModal(false);
    showToast(`Xin chào, ${userToSet.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('propai_user');
    setAnalysis(null);
    setMatch(null);
    setState(AppState.IDLE);
    showToast("Đã đăng xuất thành công");
  };

  const saveDeal = (
    currentProperty: PropertyInput, 
    currentAnalysis: AnalysisResult | null,
    status: 'draft' | 'analyzed'
  ) => {
    if (!user) return;

    const newDeal: SavedDeal = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      property: currentProperty,
      analysis: currentAnalysis,
      match: null, 
      status: status
    };

    const updatedHistory = [...user.history, newDeal];
    const updatedUser = { ...user, history: updatedHistory };
    
    setUser(updatedUser);
    showToast(status === 'draft' ? "Đã lưu bản nháp!" : "Đã lưu kết quả phân tích!");
  };

  const handleLoadDeal = (deal: SavedDeal) => {
    setProperty(deal.property);
    setAnalysis(deal.analysis);
    setMatch(deal.match || null);
    
    if (deal.analysis) {
      setState(AppState.PROPERTY_ANALYZED);
    } else {
      setState(AppState.IDLE);
    }
    setActiveTab('single');
    showToast("Đã tải lại dữ liệu từ kho lưu trữ.");
  };

  const handleDeleteDeal = (dealId: string) => {
    if (!user) return;
    const updatedHistory = user.history.filter(d => d.id !== dealId);
    setUser({ ...user, history: updatedHistory });
  };

  const handleAnalyze = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setState(AppState.ANALYZING_PROPERTY);
    setError("");
    try {
      const result = await analyzeProperty(property);
      setAnalysis(result);
      setState(AppState.PROPERTY_ANALYZED);
      
      saveDeal(property, result, 'analyzed');
      
      // Send Analysis Report to Admin
      sendEmailToAdmin('ANALYSIS', {
        user: { name: user.name, email: user.email, phone: user.phone },
        property: property,
        analysisResult: result
      });
      showToast("Đã gửi báo cáo phân tích về hệ thống.");

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to analyze property.");
      setState(AppState.ERROR);
    }
  };

  const handleMatch = async () => {
    if (!analysis || !user) return;
    setState(AppState.MATCHING_CUSTOMER);
    setError("");
    try {
      const result = await matchCustomer(property, analysis, customer);
      setMatch(result);
      setState(AppState.MATCHED);

      // Send Matching Report to Admin
      sendEmailToAdmin('MATCHING', {
        user: { name: user.name, email: user.email, phone: user.phone },
        property: property,
        customerProfile: customer,
        matchResult: result
      });
      // Not showing toast here to avoid cluttering UI, or can show a small one
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to match customer.");
      setState(AppState.ERROR);
    }
  };

  const handleBulkComplete = (data: any[]) => {
    if(user) {
      sendEmailToAdmin('BULK_ANALYSIS', {
        user: { name: user.name, email: user.email },
        summary: `Analyzed ${data.length} items`,
        results: data.map(r => ({ id: r.id, original: r.originalData, score: r.result?.investmentScore }))
      });
      showToast(`Đã hoàn thành phân tích ${data.length} tài sản!`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProperty({ ...property, images: [base64String] });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProperty({ ...property, images: [] });
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-brand-200 selection:text-brand-900">
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={handleLogin}
      />

      <UserDashboard 
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        user={user}
        onLoadDeal={handleLoadDeal}
        onDeleteDeal={handleDeleteDeal}
      />

      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl animate-fade-in-up flex items-center gap-3">
          <div className="bg-emerald-500 rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium text-sm">{showNotification}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">PropAI<span className="text-brand-600">.Vietnam</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowDashboard(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Kho dữ liệu
                  </button>
                  <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                    <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-200" />
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-slate-800">{user.name}</p>
                      <button onClick={handleLogout} className="text-[10px] text-red-500 hover:underline">Đăng xuất</button>
                    </div>
                  </div>
               </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Deal Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-600">AI</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Hệ thống phân tích bất động sản, định giá & so khớp khách hàng thông minh dành cho môi giới chuyên nghiệp.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
             <button 
               onClick={() => setActiveTab('single')}
               className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'single' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Phân tích Đơn lẻ
             </button>
             <button 
               onClick={() => {
                 if (!user) { setShowAuthModal(true); return; }
                 setActiveTab('bulk');
               }}
               className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'bulk' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded border border-brand-200">PRO</span>
               Phân tích Hàng loạt (Excel)
             </button>
          </div>
        </div>

        {activeTab === 'bulk' ? (
           <div className="max-w-4xl mx-auto">
              <BulkAnalysis onComplete={handleBulkComplete} />
           </div>
        ) : (
        <>
          {/* Input Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            
            {/* Property Card */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-brand-200 transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  Thông tin Bất động sản
                </h3>
                {state === AppState.IDLE && user && (
                  <button onClick={() => saveDeal(property, null, 'draft')} className="text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors">
                    Lưu nháp
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <div className="group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Địa chỉ chính xác</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                      placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                      value={property.address}
                      onChange={e => setProperty({...property, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Link Google Maps (Vị trí ghim)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                      placeholder="https://maps.app.goo.gl/..."
                      value={property.locationUrl || ''}
                      onChange={e => setProperty({...property, locationUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Giá (Tỷ VND)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                      value={property.price}
                      onChange={e => setProperty({...property, price: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Diện tích (m²)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                      value={property.area}
                      onChange={e => setProperty({...property, area: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Loại hình & Mô tả</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700 h-28 resize-none"
                    value={property.description}
                    onChange={e => setProperty({...property, description: e.target.value})}
                  />
                </div>

                {/* Image Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Hình ảnh thực tế (Optional)</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                    {property.images && property.images.length > 0 ? (
                      <div className="relative inline-block group">
                        <img src={property.images[0]} alt="Property" className="h-32 w-auto rounded-lg shadow-md object-cover" />
                        <button 
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                          />
                          <div className="flex flex-col items-center justify-center py-4 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-semibold text-slate-500">Kéo thả hoặc Click để tải ảnh</p>
                            <p className="text-xs text-slate-400 mt-1">Hỗ trợ JPG, PNG (Max 5MB)</p>
                          </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={state === AppState.ANALYZING_PROPERTY}
                  className="w-full bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-700 hover:to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 mt-4"
                >
                  {state === AppState.ANALYZING_PROPERTY ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang phân tích AI...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      Phân tích ngay
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Customer Card */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-indigo-200 transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  Chân dung Khách hàng
                </h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Ngân sách tối đa (Tỷ VND)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    value={customer.budget}
                    onChange={e => setCustomer({...customer, budget: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Mục đích mua</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    value={customer.purpose}
                    onChange={e => setCustomer({...customer, purpose: e.target.value})}
                  >
                    <option>Đầu tư cho thuê</option>
                    <option>Đầu tư lướt sóng (Capital Gain)</option>
                    <option>Để ở thực (An cư)</option>
                    <option>Nghỉ dưỡng / Second Home</option>
                    <option>Kinh doanh dòng tiền (Farmstay/Hotel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Khẩu vị rủi ro</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Low', 'Medium', 'High'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setCustomer({...customer, riskTolerance: level as any})}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          customer.riskTolerance === level
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {level === 'Low' ? 'An toàn' : level === 'Medium' ? 'Trung bình' : 'Mạo hiểm'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Phong cách sống & Yêu cầu khác</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 h-24 resize-none"
                    value={customer.lifestyle}
                    onChange={e => setCustomer({...customer, lifestyle: e.target.value})}
                  />
                </div>

                <button
                  onClick={handleMatch}
                  disabled={!analysis || state === AppState.MATCHING_CUSTOMER}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {state === AppState.MATCHING_CUSTOMER ? 'Đang so khớp...' : 'Kiểm tra độ phù hợp (Matching)'}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 animate-fade-in-down">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="animate-fade-in-up space-y-8">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-brand-500 pl-4">Kết quả Phân tích Deep Dive</h2>
              
              {/* Top Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Score Gauge */}
                <div className="lg:col-span-1">
                  <ScoreGauge score={analysis.investmentScore} label="Investment Score" />
                </div>

                {/* Market Value */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-center">
                  <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Định giá AI</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-800">{analysis.marketValueEstimation.min} - {analysis.marketValueEstimation.max}</span>
                    <span className="text-sm font-bold text-slate-500">Tỷ {analysis.marketValueEstimation.currency}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-2">Mô hình đề xuất:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.suggestedFunctions.slice(0, 3).map((func, i) => (
                        <span key={i} className="px-2 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-md border border-brand-100">{func}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Climate Risk */}
                <div className="lg:col-span-1">
                  <RiskRadar risks={analysis.climateRisks} />
                </div>

                {/* Terrain & Location */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-y-auto max-h-[240px]">
                  <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Địa hình & Vị trí</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {analysis.terrainAnalysis}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {analysis.coordinates.lat.toFixed(4)}, {analysis.coordinates.lng.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Market Trends Component */}
              <MarketTrends data={analysis.marketAnalysis} />

              {/* Reasoning & Grounding */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Luận giải chi tiết
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {analysis.reasoning}
                </p>
                
                {/* Grounding Links */}
                {analysis.groundingLinks && <GroundingSources links={analysis.groundingLinks} />}
              </div>
            </div>
          )}

          {/* Match Result */}
          {match && (
            <div className="mt-12 animate-fade-in-up">
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-2xl">
                  {/* Decorative bg elements */}
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
                    <div className="md:col-span-1 flex flex-col items-center text-center">
                        <div className="w-40 h-40 relative flex items-center justify-center mb-4">
                          <svg className="absolute inset-0 w-full h-full text-white/10" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" />
                          </svg>
                          <svg className="absolute inset-0 w-full h-full text-emerald-400 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${match.matchingScore * 2.827}, 282.7`} strokeLinecap="round" />
                          </svg>
                          <div className="text-5xl font-black tracking-tighter">{match.matchingScore}</div>
                        </div>
                        <div className="uppercase tracking-widest text-xs font-bold text-slate-400">Matching Score</div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                          <h2 className="text-3xl font-bold">Kết quả So khớp</h2>
                          {match.recommendation ? (
                            <span className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                              NÊN MUA / ĐẦU TƯ
                            </span>
                          ) : (
                            <span className="px-4 py-1.5 bg-red-500/20 border border-red-500/50 text-red-300 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                              CÂN NHẮC KỸ
                            </span>
                          )}
                        </div>
                        
                        <p className="text-slate-300 leading-relaxed text-lg">
                          {match.explanation}
                        </p>

                        {match.top3Products && (
                          <div className="pt-6 border-t border-white/10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Gợi ý thay thế</p>
                            <div className="flex flex-wrap gap-3">
                              {match.top3Products.map((prod, i) => (
                                <div key={i} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-white/5">
                                  {prod}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
              </div>
            </div>
          )}
        </>
        )}

      </main>
    </div>
  );
};

export default App;