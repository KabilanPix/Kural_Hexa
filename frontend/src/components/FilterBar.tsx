import React from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  category: string;
  setCategory: (val: string) => void;
  priority: string;
  setPriority: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  search: string;
  setSearch: (val: string) => void;
  onRefresh: () => void;
}

export function FilterBar({
  category,
  setCategory,
  priority,
  setPriority,
  status,
  setStatus,
  search,
  setSearch,
  onRefresh
}: FilterBarProps) {
  return (
    <div className="bg-navy-900/90 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
      <div className="relative w-full md:w-72">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search summary or complaint code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-navy-800 border border-slate-700 text-xs text-slate-200 font-medium rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="water_supply">Water Supply</option>
          <option value="roads">Roads & Potholes</option>
          <option value="electricity">Electricity</option>
          <option value="sanitation">Sanitation & Garbage</option>
          <option value="police">Public Safety / Police</option>
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-navy-800 border border-slate-700 text-xs text-slate-200 font-medium rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-navy-800 border border-slate-700 text-xs text-slate-200 font-medium rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>

        <button
          onClick={onRefresh}
          className="p-2 bg-navy-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
