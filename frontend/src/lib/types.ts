export interface Entities {
  duration?: string;
  ward?: string;
  location_text?: string;
  [key: string]: any;
}

export interface Complaint {
  id: string;
  complaint_code: string;
  citizen_id: string;
  citizen_phone?: string;
  channel: 'whatsapp' | 'voice_call' | 'web';
  category: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  summary: string;
  transcript?: string;
  raw_text?: string;
  language: string;
  lat?: number;
  lng?: number;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  created_at: string;
  updated_at?: string;
  entities?: Entities;
  incident_id?: string;
  is_new?: boolean;
}

export interface Incident {
  id: string;
  category: string;
  ward?: string;
  complaint_count: number;
  status: string;
  ai_note?: string;
  created_at: string;
  complaints?: Complaint[];
}

export interface DashboardStats {
  total_complaints: number;
  open_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  critical_complaints: number;
  active_incidents: number;
  avg_resolution_hours: number;
  sla_compliance_rate: number;
}

export interface HotspotItem {
  id: string;
  location_name: string;
  ward: string;
  lat: number;
  lng: number;
  intensity: number;
  complaint_count: number;
  category: string;
  priority: string;
}

export interface SlaItem {
  department: string;
  sla_hours: number;
  total_tickets: number;
  compliant_tickets: number;
  breached_tickets: number;
  compliance_rate: number;
}

export interface TrendItem {
  date: string;
  water_supply: number;
  roads: number;
  electricity: number;
  sanitation: number;
  police: number;
  other: number;
}
