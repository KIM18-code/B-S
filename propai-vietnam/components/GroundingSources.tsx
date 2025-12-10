import React from 'react';
import { GroundingLink } from '../types';

interface Props {
  links: GroundingLink[];
}

const GroundingSources: React.FC<Props> = ({ links }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-6 p-5 bg-slate-50/80 rounded-xl border border-slate-200/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nguồn dữ liệu thực tế (Google Grounding)</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link, idx) => (
          <a 
            key={idx}
            href={link.uri} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-xs text-slate-600 hover:text-blue-700 max-w-full"
          >
            {link.source === 'maps' ? (
              <span className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center text-[10px] group-hover:bg-emerald-100">🗺️</span>
            ) : (
              <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-[10px] group-hover:bg-blue-100">G</span>
            )}
            <span className="truncate max-w-[200px] font-medium">{link.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default GroundingSources;