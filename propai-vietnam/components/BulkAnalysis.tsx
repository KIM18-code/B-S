import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BulkRow, PropertyInput, AnalysisResult } from '../types';
import { analyzeProperty } from '../services/geminiService';

interface Props {
  onComplete: (data: any[]) => void;
}

const BulkAnalysis: React.FC<Props> = ({ onComplete }) => {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // Map basic rows
      const mappedRows: BulkRow[] = data.map((row: any, idx) => ({
        id: idx,
        originalData: row,
        status: 'pending'
      }));

      setRows(mappedRows);
    };
    reader.readAsBinaryString(file);
  };

  const mapRowToInput = (row: any): PropertyInput => {
    // Smart mapping logic: look for keywords in keys regardless of case
    const keys = Object.keys(row);
    const findValue = (keywords: string[]) => {
      const key = keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
      return key ? row[key] : undefined;
    };

    const address = findValue(['địa chỉ', 'address', 'vị trí', 'location']) || '';
    const priceRaw = findValue(['giá', 'price', 'tiền']) || 0;
    const areaRaw = findValue(['diện tích', 'area', 'm2', 'dt']) || 0;
    const type = findValue(['loại', 'type', 'mô hình']) || 'Đất nền';
    const desc = findValue(['mô tả', 'description', 'ghi chú', 'chi tiết']) || '';
    const link = findValue(['link', 'map', 'google', 'url']) || '';

    // Clean numbers
    const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(priceRaw.toString().replace(/[^0-9.]/g, '')) || 0;
    const area = typeof areaRaw === 'number' ? areaRaw : parseFloat(areaRaw.toString().replace(/[^0-9.]/g, '')) || 0;

    return {
      address: String(address),
      price: price,
      area: area,
      type: String(type),
      description: String(desc),
      locationUrl: String(link)
    };
  };

  const processBulk = async () => {
    setIsProcessing(true);
    setProgress(0);

    const newRows = [...rows];
    let completedCount = 0;

    for (let i = 0; i < newRows.length; i++) {
      if (newRows[i].status === 'completed') {
        completedCount++;
        continue;
      }

      newRows[i].status = 'processing';
      setRows([...newRows]);

      try {
        const input = mapRowToInput(newRows[i].originalData);
        // Add a small delay to avoid hitting rate limits too hard
        await new Promise(r => setTimeout(r, 1000));
        
        const result = await analyzeProperty(input);
        newRows[i].result = result;
        newRows[i].status = 'completed';
      } catch (err: any) {
        console.error("Error analyzing row", i, err);
        newRows[i].status = 'error';
        newRows[i].errorMsg = err.message || 'Lỗi phân tích';
      }

      completedCount++;
      setProgress(Math.round((completedCount / newRows.length) * 100));
      setRows([...newRows]);
    }

    setIsProcessing(false);
    onComplete(newRows);
  };

  const exportExcel = () => {
    const exportData = rows.map(row => {
      const base = { ...row.originalData };
      
      if (row.result) {
        base['AI Investment Score'] = row.result.investmentScore;
        base['AI Định giá Min (Tỷ)'] = row.result.marketValueEstimation.min;
        base['AI Định giá Max (Tỷ)'] = row.result.marketValueEstimation.max;
        base['Rủi ro khí hậu'] = `Ngập:${row.result.climateRisks.flood}/10 - Nhiệt:${row.result.climateRisks.heat}/10`;
        base['Mô hình đề xuất'] = row.result.suggestedFunctions.join(', ');
        base['Lý do đánh giá'] = row.result.reasoning;
      } else if (row.errorMsg) {
         base['AI Status'] = `Error: ${row.errorMsg}`;
      }
      
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Analysis Results");
    XLSX.writeFile(wb, `PropAI_Bulk_Result_${Date.now()}.xlsx`);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Phân tích Hàng loạt (Batch Processing)</h2>
        <p className="text-slate-500 text-sm max-w-xl mx-auto">
          Tải lên file Excel danh sách BĐS. AI sẽ tự động định giá, đánh giá rủi ro và chấm điểm từng thương vụ.
        </p>
      </div>

      {/* Upload Area */}
      {rows.length === 0 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:bg-slate-50 hover:border-brand-400 transition-all group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700">Tải lên file Excel (.xlsx)</h3>
          <p className="text-sm text-slate-400 mt-2">Hỗ trợ các cột: Địa chỉ, Giá, Diện tích, Mô tả...</p>
        </div>
      )}

      {/* Data Preview & Controls */}
      {rows.length > 0 && (
        <div>
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <span className="font-bold text-slate-700">Đã tải {rows.length} dòng</span>
                 {isProcessing && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold animate-pulse">
                      Đang xử lý {progress}%
                    </span>
                 )}
              </div>
              <div className="flex gap-2">
                 {!isProcessing && progress < 100 && (
                    <button 
                      onClick={processBulk}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-lg shadow-brand-500/30 transition-all text-sm flex items-center gap-2"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       Bắt đầu Phân tích
                    </button>
                 )}
                 {(progress > 0 || !isProcessing) && (
                    <button 
                      onClick={exportExcel}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-lg shadow-slate-900/10 transition-all text-sm flex items-center gap-2"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                       </svg>
                       Xuất báo cáo Excel
                    </button>
                 )}
                 <button 
                   onClick={() => {setRows([]); setProgress(0);}}
                   className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                 >
                    Xóa
                 </button>
              </div>
           </div>

           {/* Progress Bar */}
           {isProcessing && (
             <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
               <div 
                  className="h-full bg-gradient-to-r from-brand-400 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
               ></div>
             </div>
           )}

           {/* Table */}
           <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px]">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                 <tr>
                   <th className="px-4 py-3">Trạng thái</th>
                   <th className="px-4 py-3">Địa chỉ (Gốc)</th>
                   <th className="px-4 py-3">Giá (Gốc)</th>
                   <th className="px-4 py-3">Score (AI)</th>
                   <th className="px-4 py-3">Định giá (AI)</th>
                   <th className="px-4 py-3">Rủi ro (AI)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {rows.map((row) => (
                   <tr key={row.id} className="hover:bg-slate-50/50">
                     <td className="px-4 py-3">
                       {row.status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-300 block" title="Chờ xử lý"></span>}
                       {row.status === 'processing' && <span className="w-2 h-2 rounded-full bg-blue-500 block animate-ping" title="Đang xử lý"></span>}
                       {row.status === 'completed' && <span className="w-2 h-2 rounded-full bg-emerald-500 block" title="Hoàn tất"></span>}
                       {row.status === 'error' && <span className="w-2 h-2 rounded-full bg-red-500 block" title="Lỗi"></span>}
                     </td>
                     <td className="px-4 py-3 font-medium text-slate-700 max-w-[200px] truncate" title={String(row.originalData.address || Object.values(row.originalData)[0])}>
                        {String(row.originalData.address || row.originalData['Địa chỉ'] || Object.values(row.originalData)[0] || '-')}
                     </td>
                     <td className="px-4 py-3 text-slate-600">
                        {String(row.originalData.price || row.originalData['Giá'] || '-')}
                     </td>
                     <td className="px-4 py-3">
                        {row.result ? (
                          <span className={`font-bold ${row.result.investmentScore >= 70 ? 'text-emerald-600' : row.result.investmentScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {row.result.investmentScore}/100
                          </span>
                        ) : '-'}
                     </td>
                     <td className="px-4 py-3 text-slate-600">
                        {row.result ? `${row.result.marketValueEstimation.min}-${row.result.marketValueEstimation.max} Tỷ` : '-'}
                     </td>
                     <td className="px-4 py-3 text-xs text-slate-500">
                        {row.result ? (
                           <div className="flex gap-1">
                             <span title="Ngập lụt">💧{row.result.climateRisks.flood}</span>
                             <span title="Nắng nóng">☀️{row.result.climateRisks.heat}</span>
                           </div>
                        ) : '-'}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default BulkAnalysis;