import React from 'react';
import { Complaint } from '../lib/types';
import { MessageSquare, PhoneCall, AlertTriangle, Clock, CheckCircle2, MapPin } from 'lucide-react';

interface ComplaintCardProps {
  key?: any;
  complaint: Complaint;
  isSelected: boolean;
  onSelect: (complaint: Complaint) => void;
}

export function ComplaintCard({ complaint, isSelected, onSelect }: ComplaintCardProps) {
  const getPriorityStyle = (priority: string) => {
    switch ((priority || '').toLowerCase()) {
      case 'critical':
        return 'bg-red-950/80 text-red-400 border-red-800 animate-pulse';
      case 'high':
        return 'bg-rose-950/60 text-rose-300 border-rose-800';
      case 'medium':
        return 'bg-amber-950/60 text-amber-300 border-amber-800';
      default:
        return 'bg-blue-950/60 text-blue-300 border-blue-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'resolved':
        return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Resolved</span>;
      case 'in_progress':
        return <span className="bg-amber-950/80 text-amber-400 border border-amber-800/80 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> In Progress</span>;
      case 'escalated':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Escalated</span>;
      default:
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-800/80 text-[11px] font-semibold px-2 py-0.5 rounded-full">Open</span>;
    }
  };

  const formattedTime = complaint.created_at ? new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:45 AM';

  return (
    <div
      onClick={() => onSelect(complaint)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        complaint.is_new ? 'new-item-flash border-blue-500 bg-navy-800/90' : ''
      } ${
        isSelected
          ? 'bg-navy-700/90 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
          : 'bg-navy-800/50 border-slate-800 hover:bg-navy-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {complaint.channel === 'whatsapp' ? (
            <span className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-800/60 text-emerald-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="bg-indigo-950/60 p-1.5 rounded-lg border border-indigo-800/60 text-indigo-400">
              <PhoneCall className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="font-mono text-xs font-bold text-slate-200">{complaint.complaint_code}</span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(complaint.priority)}`}>
            {complaint.priority}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(complaint.status)}
          <span className="text-[11px] text-slate-400 font-mono">{formattedTime}</span>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-100 mb-1.5 line-clamp-2 leading-snug">
        {complaint.summary}
      </h4>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        <div className="flex items-center space-x-3">
          <span className="capitalize bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-300 font-medium">
            {(complaint.department || '').replace('_', ' ')}
          </span>
          {complaint.entities?.ward && (
            <span className="flex items-center space-x-1 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{complaint.entities.ward}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">Confidence</span>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
              style={{ width: `${Math.round((complaint.confidence || 0.9) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-300 font-medium">{Math.round((complaint.confidence || 0.9) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
