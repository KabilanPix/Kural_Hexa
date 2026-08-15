'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { KpiTiles } from '../../components/KpiTiles';
import { TrendChart } from '../../components/TrendChart';
import { SlaTable } from '../../components/SlaTable';
import { LiveMap } from '../../components/LiveMap';
import { fetchDashboardStats, fetchDashboardSla, fetchDashboardTrends } from '../../lib/api';
import { useDashboardWebSocket } from '../../lib/websocket';
import { BarChart3, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null as any);
  const [slaItems, setSlaItems] = useState([] as any[]);
  const [trends, setTrends] = useState([] as any[]);

  const { isConnected } = useDashboardWebSocket(() => {
    loadData();
  });

  const loadData = async () => {
    try {
      const [s, sla, t] = await Promise.all([
        fetchDashboardStats(),
        fetchDashboardSla(),
        fetchDashboardTrends()
      ]);
      setStats(s);
      setSlaItems(sla);
      setTrends(t);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-navy-900 text-slate-100">
      <Header isConnected={isConnected} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Administrative Governance & SLA Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time executive oversight, department response compliance, and recurring hotspot analytics.
            </p>
          </div>
          <span className="bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold px-3 py-1.5 rounded-xl font-mono">
            Zone: Chennai Central Municipal Division
          </span>
        </div>

        <KpiTiles stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <TrendChart trends={trends} />
          </div>
          <div className="lg:col-span-6">
            <SlaTable slaItems={slaItems} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <LiveMap complaints={[]} />
          </div>

          <div className="lg:col-span-5 bg-navy-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  AI Predictive Recurring Issue Flags
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Automated incident clustering detecting systemic infrastructure vulnerabilities.
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-400">Ward 18 (T. Nagar) — Water Outage Cluster</span>
                    <span className="bg-red-950 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold">14 Reports</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    AI Note: 14 reports of water pipe burst in the last 48 hours. Recommended action: Dispatch heavy pipeline engineering crew.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-navy-800/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">Ward 42 (Velachery) — Pothole Density</span>
                    <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">9 Reports</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    AI Note: Monsoon erosion causing recurring asphalt degradation near Velachery bus terminus.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-right">
              <span className="text-[11px] text-slate-500 font-mono">Powered by pgvector similarity + OpenAI GPT-4o</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
