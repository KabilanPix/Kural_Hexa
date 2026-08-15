import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, PhoneCall, BarChart3, ListFilter } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  onOpenSimulateCall?: () => void;
}

export function Header({ isConnected, onOpenSimulateCall }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">KURAL</span>
              <span className="bg-blue-900/60 border border-blue-500/30 text-blue-300 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">
                AI Gov Intel
              </span>
            </div>
            <p className="text-xs text-slate-400">Citizen Call & Message Intelligence Platform</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-1 pl-6 border-l border-slate-800">
          <Link
            href="/"
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/' 
                ? 'bg-navy-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Officer Triage Feed</span>
          </Link>

          <Link
            href="/admin"
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin' 
                ? 'bg-navy-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Admin Analytics & SLA</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-slate-300 font-medium">
            {isConnected ? 'Live WebSockets Active' : 'Connecting Stream...'}
          </span>
        </div>

        {onOpenSimulateCall && (
          <button
            onClick={onOpenSimulateCall}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Simulate Voice Call</span>
          </button>
        )}
      </div>
    </header>
  );
}
