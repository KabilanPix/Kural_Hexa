import React, { useState } from 'react';
import { simulateVoiceCall } from '../lib/api';
import { PhoneCall, X, Bot, CheckCircle2 } from 'lucide-react';

interface SimulateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplaintCreated: () => void;
}

export function SimulateCallModal({ isOpen, onClose, onComplaintCreated }: SimulateCallModalProps) {
  const [transcript, setTranscript] = useState(
    'வேளச்சேரி மெயின் ரோட்டில் சாக்கடை நிரம்பி வழிகிறது 2 நாட்களாக. கடும் துர்நாற்றம் அடிக்கிறது, உடனடியாக நடவடிக்கை எடுக்கவும்.'
  );
  const [phone, setPhone] = useState('+919360708759');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null as any);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await simulateVoiceCall(transcript, phone);
      setResult(res);
      onComplaintCreated();
    } catch (err) {
      console.error('Call simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Simulate Citizen AI Phone Call</h3>
            <p className="text-xs text-slate-400">Test voice classification & Realtime tool execution</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Citizen Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-navy-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Simulated Voice Transcript (Tamil / Tanglish / English)</label>
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full bg-navy-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-slate-400 font-medium">Quick Preset:</span>
            <button
              type="button"
              onClick={() => setTranscript('T. Nagar market la water pipe burst aagidichu! Emergency repair kudunga!')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700"
            >
              Tamil Pipe Burst
            </button>
            <button
              type="button"
              onClick={() => setTranscript('No electricity in Anna Nagar Ward 10 transformer sparking loud noise!')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
            >
              Transformer Fire
            </button>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>{loading ? 'Processing AI Pipeline...' : 'Run Call Simulation & Tools'}</span>
          </button>

          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Call Processed & Tool Executed Successfully!</span>
              </div>
              <p className="text-slate-300">
                Code: <strong className="text-white font-mono">{result.tool_execution_result?.complaint_code}</strong> | Department: <strong className="text-white capitalize">{result.tool_execution_result?.department}</strong>
              </p>
              <p className="text-slate-400 italic">"{result.tool_execution_result?.message}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
