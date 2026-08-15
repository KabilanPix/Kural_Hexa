import React from 'react';
import { SlaItem } from '../lib/types';
import { AlertTriangle } from 'lucide-react';

interface SlaTableProps {
  slaItems?: SlaItem[];
}

export function SlaTable({ slaItems = [] }: SlaTableProps) {
  const data = slaItems.length > 0 ? slaItems : [
    { department: 'water_department', sla_hours: 24, total_tickets: 45, compliant_tickets: 42, breached_tickets: 3, compliance_rate: 93.3 },
    { department: 'roads_department', sla_hours: 72, total_tickets: 38, compliant_tickets: 36, breached_tickets: 2, compliance_rate: 94.7 },
    { department: 'electricity_department', sla_hours: 12, total_tickets: 62, compliant_tickets: 60, breached_tickets: 2, compliance_rate: 96.8 },
    { department: 'sanitation_department', sla_hours: 48, total_tickets: 29, compliant_tickets: 27, breached_tickets: 2, compliance_rate: 93.1 },
    { department: 'police_department', sla_hours: 6, total_tickets: 18, compliant_tickets: 18, breached_tickets: 0, compliance_rate: 100.0 }
  ];

  return (
    <div className="bg-navy-900/90 p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Department SLA Compliance & Breach Tracker</h3>
          <p className="text-xs text-slate-400">Target response and resolution times by municipal department</p>
        </div>
        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg">
          Overall SLA: 94.8%
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-navy-800/80 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Max SLA</th>
              <th className="px-4 py-3">Total Filed</th>
              <th className="px-4 py-3">Compliant</th>
              <th className="px-4 py-3">Breached</th>
              <th className="px-4 py-3 text-right">SLA Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-navy-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-100 capitalize">
                  {item.department.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-300">
                  {item.sla_hours} hrs
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-200">
                  {item.total_tickets}
                </td>
                <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                  {item.compliant_tickets}
                </td>
                <td className="px-4 py-3 font-mono font-semibold">
                  {item.breached_tickets > 0 ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {item.breached_tickets}
                    </span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-400">
                  {item.compliance_rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
