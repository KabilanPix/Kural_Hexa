import React from 'react';
import { TrendItem } from '../lib/types';

interface TrendChartProps {
  trends?: TrendItem[];
}

export function TrendChart({ trends = [] }: TrendChartProps) {
  const data = trends.length > 0 ? trends : [
    { date: 'Aug 08', water_supply: 12, roads: 8, electricity: 15, sanitation: 6 },
    { date: 'Aug 09', water_supply: 15, roads: 10, electricity: 12, sanitation: 8 },
    { date: 'Aug 10', water_supply: 18, roads: 14, electricity: 20, sanitation: 10 },
    { date: 'Aug 11', water_supply: 14, roads: 12, electricity: 18, sanitation: 9 },
    { date: 'Aug 12', water_supply: 22, roads: 16, electricity: 24, sanitation: 12 },
    { date: 'Aug 13', water_supply: 25, roads: 18, electricity: 21, sanitation: 15 },
    { date: 'Aug 14', water_supply: 20, roads: 15, electricity: 19, sanitation: 11 },
  ];

  const maxVal = 30;

  return (
    <div className="bg-navy-900/90 p-5 rounded-2xl border border-slate-800 h-80 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">7-Day Complaint Volume Trend</h3>
          <p className="text-xs text-slate-400">Grievance inflow categorized by primary department</p>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-300">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Water</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Electricity</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Roads</span>
          </span>
        </div>
      </div>

      <div className="w-full flex-1 flex items-end justify-between gap-3 px-4 pt-4 pb-2 border-b border-slate-800">
        {data.map((item, idx) => {
          const waterH = Math.round((item.water_supply / maxVal) * 100);
          const elecH = Math.round((item.electricity / maxVal) * 100);
          const roadH = Math.round((item.roads / maxVal) * 100);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="w-full max-w-[28px] flex items-end gap-1 h-44">
                <div
                  style={{ height: `${waterH}%` }}
                  className="w-1/3 bg-blue-500 rounded-t-sm group-hover:bg-blue-400 transition-all"
                  title={`Water: ${item.water_supply}`}
                />
                <div
                  style={{ height: `${elecH}%` }}
                  className="w-1/3 bg-indigo-500 rounded-t-sm group-hover:bg-indigo-400 transition-all"
                  title={`Electricity: ${item.electricity}`}
                />
                <div
                  style={{ height: `${roadH}%` }}
                  className="w-1/3 bg-amber-500 rounded-t-sm group-hover:bg-amber-400 transition-all"
                  title={`Roads: ${item.roads}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-2">{item.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
