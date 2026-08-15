import React from 'react';
import { Complaint, HotspotItem } from '../lib/types';
import { MapPin, Navigation } from 'lucide-react';

interface LiveMapProps {
  complaints?: Complaint[];
  hotspots?: HotspotItem[];
  onSelectComplaint?: (c: Complaint) => void;
}

export function LiveMap({ complaints = [], hotspots = [], onSelectComplaint }: LiveMapProps) {
  return (
    <div className="h-full min-h-[380px] bg-navy-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between z-10 bg-navy-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Live Geo Hotspots & Incident Ward Map</h4>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Chennai Metropolitan Zone</span>
      </div>

      <div className="my-4 relative flex-1 bg-gradient-to-br from-slate-950 via-navy-900 to-slate-900 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

        <div className="relative w-full h-full p-8 flex flex-wrap items-center justify-around z-10">
          <div className="absolute top-1/4 left-1/3 flex flex-col items-center group cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-ping absolute" />
            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="mt-1 bg-navy-900/90 border border-slate-700 px-2.5 py-1 rounded-md text-[11px] text-red-300 font-bold shadow-xl">
              Ward 18 (T. Nagar) - 14 Reports
            </div>
          </div>

          <div className="absolute top-1/2 left-2/3 flex flex-col items-center group cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center animate-pulse absolute" />
            <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="mt-1 bg-navy-900/90 border border-slate-700 px-2 py-0.5 rounded-md text-[10px] text-amber-300 font-bold shadow-xl">
              Ward 42 (Velachery) - 9 Reports
            </div>
          </div>

          <div className="absolute bottom-1/3 left-1/4 flex flex-col items-center group cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <div className="mt-1 bg-navy-900/90 border border-slate-700 px-2 py-0.5 rounded-md text-[10px] text-blue-300 font-bold shadow-xl">
              Ward 10 (Anna Nagar) - 6 Reports
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Critical / High Priority</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Medium Priority</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Low Priority</span>
          </span>
        </div>
        <span className="text-slate-500">Vector Ward Density Active</span>
      </div>
    </div>
  );
}
