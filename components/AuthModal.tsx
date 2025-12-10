import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

// NOTE: Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = ""; // e.g., "123456789-abc.apps.googleusercontent.com"

const AuthModal: React.FC<Props> = ({ isOpen, onClose, onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'form' | 'google' | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Handle Real Google OAuth (One Tap / Button)
  useEffect(() => {
    if (!isOpen) return;
    
    // Check if Google script is loaded and Client ID is set
    if ((window as any).google && GOOGLE_CLIENT_ID) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleButtonDiv"),
          { theme: "outline", size: "large", width: "100%" }
        );
      } catch (e) {
        console.warn("Google Sign-In initialization failed", e);
      }
    }
  }, [isOpen]);

  const handleCredentialResponse = (response: any) => {
    try {
      // Decode JWT
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      
      const googleUser: User = {
        id: `google_${payload.sub}`,
        name: payload.name,
        email: payload.email,
        phone: '', // Google often doesn't share phone
        tier: 'free',
        joinedAt: new Date(),
        avatar: payload.picture,
        history: []
      };

      onLogin(googleUser);
    } catch (e) {
      console.error("Error decoding Google credential", e);
    }
  };

  const handleMockGoogleLogin = async () => {
    setLoading(true);
    setAuthMethod('google');

    // Simulate Google OAuth delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated Data from Google
    const googleUser: User = {
      id: `google_${Date.now()}`,
      name: 'Nguyen Van A (Google)', 
      email: 'nguyenvana.demo@gmail.com',
      phone: '', 
      tier: 'free',
      joinedAt: new Date(),
      avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=DB4437&color=fff',
      history: []
    };

    onLogin(googleUser);
    setLoading(false);
    setAuthMethod(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthMethod('form');

    // Basic Validation for Phone if Registering
    if (isRegister && formData.phone && !/^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/.test(formData.phone)) {
        alert("Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
        setLoading(false);
        setAuthMethod(null);
        return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create User Object from ACTUAL Input Data
    const newUser: User = {
      id: isRegister ? `user_${Date.now()}` : 'user_existing_123',
      name: isRegister ? formData.name : (formData.name || 'Thành viên'),
      email: formData.email,
      phone: formData.phone,
      tier: 'free',
      joinedAt: new Date(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(isRegister ? formData.name : 'User')}&background=0d9488&color=fff`,
      history: [] // Initialize empty history
    };

    onLogin(newUser);
    setLoading(false);
    setAuthMethod(null);
    
    // Reset form
    setFormData({ name: '', email: '', phone: '', password: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-400 to-indigo-500"></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              {isRegister ? 'Đăng ký Thành viên' : 'Chào mừng trở lại'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRegister 
                ? 'Nhập thông tin để tạo hồ sơ lưu trữ.' 
                : 'Đăng nhập để tiếp tục phân tích.'}
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {GOOGLE_CLIENT_ID ? (
              <div id="googleButtonDiv" className="w-full flex justify-center h-[44px]"></div>
            ) : (
              <button 
                onClick={handleMockGoogleLogin}
                disabled={loading}
                className="relative flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm text-slate-600 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group bg-white"
              >
                 {loading && authMethod === 'google' ? (
                   <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 ) : (
                   <>
                     <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                     <span>Tiếp tục bằng Google</span>
                   </>
                 )}
              </button>
            )}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">hoặc nhập thông tin</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
               <div className="group animate-fade-in-up">
                <input 
                  type="text" 
                  required
                  placeholder="Họ và Tên đầy đủ"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-slate-800 transition-all font-medium"
                />
              </div>
            )}
            
            <div className="group">
              <input 
                type="email" 
                required
                placeholder="Địa chỉ Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-slate-800 transition-all font-medium"
              />
            </div>

            {isRegister && (
              <div className="group animate-fade-in-up">
                <input 
                  type="tel" 
                  required
                  placeholder="Số điện thoại (VD: 0912...)"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-slate-800 transition-all font-medium"
                />
              </div>
            )}

            <div className="group">
              <input 
                type="password" 
                required
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-slate-800 transition-all font-medium"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading && authMethod === 'form' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                isRegister ? 'Hoàn tất Đăng ký' : 'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="ml-1 font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                {isRegister ? 'Đăng nhập' : 'Đăng ký bằng SĐT/Email'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;