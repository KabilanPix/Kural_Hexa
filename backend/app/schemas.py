from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

# --- AI & Classification Schemas ---
class EntitiesSchema(BaseModel):
    duration: Optional[str] = "unspecified"
    ward: Optional[str] = "unspecified"
    location_text: Optional[str] = "unspecified"

class ClassificationRequest(BaseModel):
    text: str

class ClassificationResponse(BaseModel):
    category: str
    department: str
    priority: str  # low | medium | high | critical
    sentiment: str # positive | neutral | negative
    summary: str
    confidence: float
    entities: Dict[str, Any] = Field(default_factory=dict)
    is_emergency: bool = False

class DuplicateCheckRequest(BaseModel):
    text: Optional[str] = None
    embedding: Optional[List[float]] = None
    category: Optional[str] = None
    ward: Optional[str] = None

class DuplicateMatchItem(BaseModel):
    complaint_id: str
    complaint_code: str
    summary: str
    category: str
    similarity: float

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    matches: List[DuplicateMatchItem] = Field(default_factory=list)


# --- Citizen Schemas ---
class CitizenBase(BaseModel):
    phone: str
    name: Optional[str] = None
    language_pref: Optional[str] = "en"

class CitizenCreate(CitizenBase):
    pass

class CitizenResponse(CitizenBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- Complaint Schemas ---
class ComplaintCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    channel: str = "telegram"
    raw_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    transcript: Optional[str] = None

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None # open | in_progress | resolved | escalated
    department: Optional[str] = None
    priority: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: UUID
    complaint_code: str
    citizen_id: UUID
    citizen_phone: Optional[str] = None
    channel: str
    category: str
    department: str
    priority: str
    sentiment: str
    confidence: float
    summary: Optional[str] = None
    transcript: Optional[str] = None
    raw_text: Optional[str] = None
    language: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime
    entities: Optional[Dict[str, Any]] = None
    incident_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# --- Incident Schemas ---
class IncidentResponse(BaseModel):
    id: UUID
    category: str
    ward: Optional[str] = None
    complaint_count: int
    status: str
    ai_note: Optional[str] = None
    created_at: datetime
    complaints: List[ComplaintResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# --- Department Schemas ---
class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    sla_hours: int

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class DashboardStats(BaseModel):
    total_complaints: int
    open_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    critical_complaints: int
    active_incidents: int
    avg_resolution_hours: float
    sla_compliance_rate: float

class DashboardTrendItem(BaseModel):
    date: str
    water_supply: int = 0
    roads: int = 0
    electricity: int = 0
    sanitation: int = 0
    police: int = 0
    other: int = 0

class HotspotItem(BaseModel):
    id: str
    location_name: str
    ward: str
    lat: float
    lng: float
    intensity: float
    complaint_count: int
    category: str
    priority: str

class SlaItem(BaseModel):
    department: str
    sla_hours: int
    total_tickets: int
    compliant_tickets: int
    breached_tickets: int
    compliance_rate: float
