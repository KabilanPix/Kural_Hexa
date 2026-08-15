import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base

# Junction table for Incident <-> Complaint M2M relationship
incident_complaints = Table(
    "incident_complaints",
    Base.metadata,
    Column("incident_id", UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True),
    Column("complaint_id", UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), primary_key=True),
)

class Citizen(Base):
    __tablename__ = "citizens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    language_pref = Column(String, default="en")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    complaints = relationship("Complaint", back_populates="citizen", cascade="all, delete-orphan")
    call_logs = relationship("CallLog", back_populates="citizen", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    sla_hours = Column(Integer, nullable=False, default=48)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String, nullable=False)
    ward = Column(String, nullable=True)
    complaint_count = Column(Integer, default=1)
    status = Column(String, default="open")
    ai_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    complaints = relationship("Complaint", secondary=incident_complaints, back_populates="incidents")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_code = Column(String, unique=True, nullable=False, index=True)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String, default="telegram")
    category = Column(String, nullable=False)
    department = Column(String, nullable=False)
    priority = Column(String, default="medium") # low | medium | high | critical
    sentiment = Column(String, default="neutral") # positive | neutral | negative
    confidence = Column(Float, default=0.9)
    summary = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
    language = Column(String, default="en")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    status = Column(String, default="open") # open | in_progress | resolved | escalated
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    citizen = relationship("Citizen", back_populates="complaints")
    incidents = relationship("Incident", secondary=incident_complaints, back_populates="complaints")


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    transcript = Column(Text, nullable=True)
    language = Column(String, default="en")
    duration_seconds = Column(Integer, default=0)
    linked_complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    citizen = relationship("Citizen", back_populates="call_logs")
    linked_complaint = relationship("Complaint")
