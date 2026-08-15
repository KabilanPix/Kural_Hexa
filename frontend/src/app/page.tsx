'use client';

import React, { useState, useEffect } from 'react';
import { Complaint } from '../lib/types';
import { fetchComplaints } from '../lib/api';
import { useDashboardWebSocket } from '../lib/websocket';
import { Header } from '../components/Header';
import { FilterBar } from '../components/FilterBar';
import { ComplaintCard } from '../components/ComplaintCard';
import { ComplaintDetail } from '../components/ComplaintDetail';
import { LiveMap } from '../components/LiveMap';
import { SimulateCallModal } from '../components/SimulateCallModal';
import { KpiTiles } from '../components/KpiTiles';
import { Inbox } from 'lucide-react';

export default function OfficerDashboard() {
  const [complaints, setComplaints] = useState([] as any[]);
  const [selectedComplaint, setSelectedComplaint] = useState(null as any);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [simModalOpen, setSimModalOpen] = useState(false);

  const { isConnected } = useDashboardWebSocket((event) => {
    if (event.event === 'NEW_COMPLAINT') {
      const newComp = { ...event.data, is_new: true };
      setComplaints((prev) => [newComp, ...prev]);
    } else if (event.event === 'COMPLAINT_UPDATED') {
      setComplaints((prev) =>
        prev.map((c) => (c.id === event.data.id ? { ...c, ...event.data } : c))
      );
      if (selectedComplaint?.id === event.data.id) {
        setSelectedComplaint((prev: any) => (prev ? { ...prev, ...event.data } : null));
      }
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchComplaints({ category, priority, status, search });
      setComplaints(data);
      if (data.length > 0 && !selectedComplaint) {
        setSelectedComplaint(data[0]);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [category, priority, status, search]);

  const handleComplaintUpdated = (updated: Complaint) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedComplaint(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-900 text-slate-100">
      <Header isConnected={isConnected} onOpenSimulateCall={() => setSimModalOpen(true)} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        <KpiTiles stats={null} />

        <FilterBar
          category={category}
          setCategory={setCategory}
          priority={priority}
          setPriority={setPriority}
          status={status}
          setStatus={setStatus}
          search={search}
          setSearch={setSearch}
          onRefresh={loadData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          <div className="lg:col-span-4 flex flex-col bg-navy-900/60 rounded-2xl border border-slate-800 p-4 h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <Inbox className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Grievance Queue
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
                {complaints.length} Filed
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                  Loading complaints stream...
                </div>
              ) : complaints.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No complaints match selected filters.
                </div>
              ) : (
                complaints.map((comp) => (
                  <ComplaintCard
                    key={comp.id}
                    complaint={comp}
                    isSelected={selectedComplaint?.id === comp.id}
                    onSelect={(c) => setSelectedComplaint(c)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 h-full">
            <ComplaintDetail
              complaint={selectedComplaint}
              onComplaintUpdated={handleComplaintUpdated}
            />
          </div>

          <div className="lg:col-span-3 h-full">
            <LiveMap complaints={complaints} onSelectComplaint={(c) => setSelectedComplaint(c)} />
          </div>
        </div>
      </main>

      <SimulateCallModal
        isOpen={simModalOpen}
        onClose={() => setSimModalOpen(false)}
        onComplaintCreated={loadData}
      />
    </div>
  );
}
