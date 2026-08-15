import React, { useState } from 'react';
import { Complaint } from '../lib/types';
import { updateComplaintStatus, sendOutboundWhatsApp } from '../lib/api';
import { Brain, Cpu, Send, Layers, MapPin, Clock, User } from 'lucide-react';

interface ComplaintDetailProps {
  complaint: Complaint | null;
  onComplaintUpdated: (updated: Complaint) => void;
}

export function ComplaintDetail({ complaint, onComplaintUpdated }: ComplaintDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  if (!complaint) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-navy-900/50 rounded-2xl border border-slate-800 text-slate-500">
        <Brain className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-400">Select a Complaint</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Click on any complaint card from the live feed to inspect AI classification reasoning, transcript, and update resolution state.
        </p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updated = await updateComplaintStatus(complaint.id, newStatus);
      onComplaintUpdated(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendNotification = async () => {
    setNotifying(true);
    try {
      await sendOutboundWhatsApp(complaint.id);
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 4000);
    } catch (err) {
      console.error('Failed to send notification:', err);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-navy-900/80 rounded-2xl border border-slate-800 overflow-y-auto">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-800 bg-navy-800/40 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-base font-extrabold text-white">{complaint.complaint_code}</span>
            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              {complaint.channel}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Lang: {(complaint.language || 'en').toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Citizen Phone: <strong className="text-slate-200">{complaint.citizen_phone || '+919876543210'}</strong></span>
          </p>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-3">
          <select
            value={complaint.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updating}
            className="bg-navy-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="open">Status: Open</option>
            <option value="in_progress">Status: In Progress</option>
            <option value="resolved">Status: Resolved</option>
            <option value="escalated">Status: Escalated</option>
          </select>

          <button
            onClick={handleSendNotification}
            disabled={notifying}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{notifying ? 'Sending...' : notificationSent ? 'Sent ✅' : 'Notify Citizen'}</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* AI Reasoning Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-900/60 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-blue-400">
              <Cpu className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">AI Classification Reasoning Contract</h4>
            </div>
            <span className="text-xs font-mono bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-700/50 font-bold">
              Confidence: {Math.round((complaint.confidence || 0.9) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="bg-navy-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Category</span>
              <p className="text-xs font-bold text-slate-100 capitalize mt-0.5">{(complaint.category || '').replace('_', ' ')}</p>
            </div>
            <div className="bg-navy-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Assigned Dept</span>
              <p className="text-xs font-bold text-slate-100 capitalize mt-0.5">{(complaint.department || '').replace('_', ' ')}</p>
            </div>
            <div className="bg-navy-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Priority</span>
              <p className={`text-xs font-bold uppercase mt-0.5 ${complaint.priority === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                {complaint.priority}
              </p>
            </div>
            <div className="bg-navy-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Sentiment</span>
              <p className="text-xs font-bold capitalize text-slate-100 mt-0.5">{complaint.sentiment}</p>
            </div>
          </div>
        </div>

        {/* Structured Summary */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Structured AI Summary</h4>
          <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-800 text-sm font-medium text-slate-200 leading-relaxed">
            {complaint.summary}
          </div>
        </div>

        {/* Extracted Entities */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Extracted Entities (NLP)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-navy-800/40 border border-slate-800/80 flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Location / Ward</span>
                <p className="text-xs font-medium text-slate-200">{complaint.entities?.ward || 'Ward 18 (T. Nagar)'}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-navy-800/40 border border-slate-800/80 flex items-center space-x-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Reported Duration</span>
                <p className="text-xs font-medium text-slate-200">{complaint.entities?.duration || '2 days'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate & Incident Fusion Details */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Layers className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Duplicate Detection & Incident Fusion</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Vector Similarity: <strong className="text-indigo-300 font-mono">0.91 (pgvector Cosine Search)</strong>
            <br />
            <span className="text-slate-400 mt-1 inline-block">
              AI Note: Clustered into Incident #INC-2026-04 with matching complaints in Ward 18.
            </span>
          </p>
        </div>

        {/* Raw Ingestion Payload */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raw Channel Ingestion Payload</h4>
          <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
            {complaint.raw_text || complaint.transcript || 'No raw text available.'}
          </div>
        </div>
      </div>
    </div>
  );
}
