import React, { useState } from 'react';
import { MarketAnalysis } from '../types';

interface Props {
  data: MarketAnalysis;
}

const MarketTrends: React.FC<Props> = ({ data }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!data) return null;

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-800 font-extrabold text-xl flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-1.5 rounded-lg shadow-md shadow-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </span>
          Xu hướng & Định giá
        </h3>
        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
          Market Intelligence
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
           <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-2">Đơn giá trung bình</p>
           <p className="text-2xl font-black text-slate-800 tracking-tight">{data.averagePricePerM2}</p>
        </div>
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 flex flex-col justify-center">
           <h4 className="text-xs text-indigo-800 uppercase font-bold tracking-wide mb-1 flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
             Dự báo tương lai
           </h4>
           <p className="text-sm text-slate-700 font-medium leading-relaxed">
             {data.futureProjections}
           </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">Lịch sử biến động giá</h4>
        <div className="relative border-l-2 border-slate-100 ml-3 pl-8 space-y-4 pb-2">
          {data.historicalTrends?.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Dot */}
              <div 
                className={`absolute -left-[39px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 transition-all cursor-pointer ${
                  expandedIndex === idx 
                    ? 'bg-blue-600 scale-110 ring-4 ring-blue-50' 
                    : 'bg-slate-300 group-hover:bg-blue-400'
                }`}
                onClick={() => toggleExpand(idx)}
              ></div>
              
              <div 
                className={`p-4 rounded-xl transition-all cursor-pointer border ${
                  expandedIndex === idx 
                    ? 'bg-white border-blue-200 shadow-lg translate-x-1' 
                    : 'bg-transparent border-transparent hover:bg-slate-50'
                }`}
                onClick={() => toggleExpand(idx)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                   <span className="text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded-md self-start shadow-sm">{item.timeline}</span>
                   <div className="flex items-center gap-2">
                     <span className={`text-sm font-bold ${item.priceTrend.includes('tăng') || item.priceTrend.includes('+') ? 'text-green-600' : 'text-slate-700'}`}>
                       {item.priceTrend}
                     </span>
                     <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.description}</p>
                
                {/* Expanded Content: News Snippet */}
                {expandedIndex === idx && item.newsContext && (
                  <div className="mt-4 bg-blue-50/50 rounded-lg p-3 border border-blue-100 animate-fade-in-down">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-blue-100 p-1 rounded text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1 opacity-70">Tin tức & Sự kiện</p>
                         <p className="text-sm text-slate-700 italic">{item.newsContext}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!data.historicalTrends || data.historicalTrends.length === 0) && (
            <p className="text-sm text-slate-400 italic pl-2">Chưa có dữ liệu lịch sử</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketTrends;