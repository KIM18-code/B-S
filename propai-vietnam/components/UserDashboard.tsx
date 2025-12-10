import React from 'react';
import { SavedDeal, User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLoadDeal: (deal: SavedDeal) => void;
  onDeleteDeal: (dealId: string) => void;
}

const UserDashboard: React.FC<Props> = ({ isOpen, onClose, user, onLoadDeal, onDeleteDeal }) => {
  if (!isOpen || !user) return null;

  // Sort history by newest first
  const history = [...(user.history || [])].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-fade-in-down flex flex-col border-l border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Kho dữ liệu của bạn</h2>
            <p className="text-xs text-slate-500 mt-1">Lưu trữ riêng tư & Bảo mật</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Chưa có dữ liệu nào được lưu.</p>
            </div>
          ) : (
            history.map((deal) => (
              <div 
                key={deal.id} 
                className="group bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer relative"
                onClick={() => {
                  onLoadDeal(deal);
                  onClose();
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${deal.status === 'analyzed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {deal.status === 'analyzed' ? 'Đã phân tích' : 'Bản nháp'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(deal.timestamp).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeal(deal.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Xóa"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{deal.property.address || "Chưa có địa chỉ"}</h3>
                
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {deal.property.price > 0 ? `${deal.property.price} Tỷ` : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    {deal.property.area > 0 ? `${deal.property.area} m²` : 'N/A'}
                  </span>
                  
                  {deal.analysis && (
                    <span className="ml-auto font-bold text-brand-600 flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded">
                      {deal.analysis.investmentScore}
                      <span className="text-[9px] font-normal text-brand-400">PTS</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400">Dữ liệu được lưu trữ cục bộ trên thiết bị này.</p>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
