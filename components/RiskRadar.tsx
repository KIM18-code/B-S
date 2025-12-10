import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { ClimateRisk } from '../types';

interface Props {
  risks: ClimateRisk;
}

const RiskRadar: React.FC<Props> = ({ risks }) => {
  const data = [
    { subject: 'Ngập lụt', A: risks.flood, fullMark: 10 },
    { subject: 'Nắng nóng', A: risks.heat, fullMark: 10 },
    { subject: 'Hạn hán', A: risks.drought, fullMark: 10 },
    { subject: 'Cháy rừng', A: risks.forestFire, fullMark: 10 },
  ];

  return (
    <div className="w-full h-full min-h-[240px] bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 p-6 flex flex-col">
      <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider text-center">Rủi ro khí hậu</h3>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              name="Risk Level"
              dataKey="A"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="#f43f5e"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskRadar;