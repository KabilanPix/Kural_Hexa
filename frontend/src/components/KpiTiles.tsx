import React from 'react';
import { DashboardStats } from '../lib/types';
import { FileText, Clock, CheckCircle, AlertTriangle, Layers, ShieldCheck } from 'lucide-react';

interface KpiTilesProps {
  stats?: DashboardStats | null;
}

export function KpiTiles({ stats }: KpiTilesProps) {
  const data = stats || {
    total_complaints: 184,
    open_complaints: 42,
    in_progress_complaints: 68,
    resolved_complaints: 74,
    critical_complaints: 12,
    active_incidents: 5,
    avg_resolution_hours: 14.2,
    sla_compliance_rate: 94.5
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Total Filed</span>
          <FileText className="w-4 h-4 text-blue-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-white font-mono">{data.total_complaints}</span>
          <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">+18 today</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-navy-900/80 border border-indigo-900/60 flex flex-col justify-between">
        <div className="flex items-center justify-between text-indigo-400">
          <span className="text-xs font-medium uppercase tracking-wider">Fused Incidents</span>
          <Layers className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-indigo-200 font-mono">{data.active_incidents}</span>
          <span className="text-[10px] text-indigo-300 block mt-0.5">Clustered Grievances</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex flex-col justify-between">
        <div className="flex items-center justify-between text-red-400">
          <span className="text-xs font-medium uppercase tracking-wider">Critical / High</span>
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-red-300 font-mono">{data.critical_complaints}</span>
          <span className="text-[10px] text-red-400 font-medium block mt-0.5">Urgent Response</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/60 flex flex-col justify-between">
        <div className="flex items-center justify-between text-amber-400">
          <span className="text-xs font-medium uppercase tracking-wider">In Progress</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-amber-200 font-mono">{data.in_progress_complaints}</span>
          <span className="text-[10px] text-amber-400 block mt-0.5">Field Action Active</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex flex-col justify-between">
        <div className="flex items-center justify-between text-emerald-400">
          <span className="text-xs font-medium uppercase tracking-wider">Resolved</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-emerald-200 font-mono">{data.resolved_complaints}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">Citizen Verified</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-navy-900/80 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">SLA Rate</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">{data.sla_compliance_rate}%</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Target &gt; 90%</span>
        </div>
      </div>
    </div>
  );
}
