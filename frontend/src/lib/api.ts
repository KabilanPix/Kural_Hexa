import { Complaint, Incident, DashboardStats, HotspotItem, SlaItem, TrendItem } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetchComplaints(params?: {
  category?: string;
  priority?: string;
  status?: string;
  department?: string;
  search?: string;
}): Promise<Complaint[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.priority) query.append('priority', params.priority);
  if (params?.status) query.append('status', params.status);
  if (params?.department) query.append('department', params.department);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/complaints?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export async function updateComplaintStatus(id: string, status: string, department?: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, department })
  });
  if (!res.ok) throw new Error('Failed to update complaint status');
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchDashboardHotspots(): Promise<HotspotItem[]> {
  const res = await fetch(`${API_BASE}/dashboard/hotspots`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch hotspots');
  return res.json();
}

export async function fetchDashboardSla(): Promise<SlaItem[]> {
  const res = await fetch(`${API_BASE}/dashboard/sla`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch SLA');
  return res.json();
}

export async function fetchDashboardTrends(): Promise<TrendItem[]> {
  const res = await fetch(`${API_BASE}/dashboard/trends`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
}

export async function simulateVoiceCall(transcript: string, phone: string = "+919876543210"): Promise<any> {
  const res = await fetch(`${API_BASE}/voice/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, phone, action: 'create_complaint' })
  });
  if (!res.ok) throw new Error('Failed to simulate call');
  return res.json();
}

export async function sendOutboundWhatsApp(complaintId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/notify/whatsapp-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint_id: complaintId })
  });
  if (!res.ok) throw new Error('Failed to send notification');
  return res.json();
}
