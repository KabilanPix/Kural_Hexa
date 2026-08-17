/**
 * TicketQueue — the main filterable list of tickets represented as a Kanban Board.
 *
 * Features:
 * - Kanban board with 3 status columns: Open, In Progress, Resolved
 * - Filter by department and source (call/text)
 * - Clean cards showing: ticket number, summary, location, urgency, sentiment, duplicate count, SLA, source, recording links
 * - New tickets get a brief highlight animation
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DEPARTMENTS = [
  'All Departments',
  'Sanitation',
  'Water Supply',
  'Electricity',
  'Roads & Infrastructure',
  'Health Services',
  'Police',
  'General Grievance',
];

const STATUSES = ['All Statuses', 'open', 'in_progress', 'resolved', 'incomplete'];
const SOURCES = ['All Sources', 'call', 'text'];

export default function TicketQueue({ tickets, newTicketIds, fixedDepartment }) {
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sourceFilter, setSourceFilter] = useState('All Sources');

  // Apply filters
  const primaryTickets = tickets.filter((t) => !t.duplicate_of);
  let filtered = primaryTickets;

  if (fixedDepartment) {
    filtered = filtered.filter((t) => t.department === fixedDepartment);
  } else if (departmentFilter !== 'All Departments') {
    filtered = filtered.filter((t) => t.department === departmentFilter);
  }
  if (statusFilter !== 'All Statuses') {
    filtered = filtered.filter((t) => t.status === statusFilter);
  }
  if (sourceFilter !== 'All Sources') {
    filtered = filtered.filter((t) => t.source === sourceFilter);
  }

  // Sort newest-first
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Change ticket status via backend to trigger Telegram notifications
  async function handleStatusChange(ticketId, newStatus) {
    try {
      const response = await fetch(`http://localhost:3000/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        console.error('Failed to update status');
      }
    } catch (err) {
      console.error('Error calling backend for status update:', err);
    }
  }

  // Categorize for Kanban
  const openTickets = filtered.filter(t => t.status === 'open' || t.status === 'incomplete');
  const inProgressTickets = filtered.filter(t => t.status === 'in_progress');
  const resolvedTickets = filtered.filter(t => t.status === 'resolved');

  return (
    <div className="ticket-queue-section">
      <div className="queue-controls">
        <div className="filters">
          {!fixedDepartment && (
            <select
              className="filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              id="filter-department"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="filter-status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All Statuses' ? s : s.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            id="filter-source"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s === 'All Sources' ? s : s === 'call' ? '📞 Call' : '📝 Text'}
              </option>
            ))}
          </select>
        </div>
        <span className="queue-total-count">
          Total filtered: <strong>{filtered.length}</strong>
        </span>
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board">
        {/* Column 1: Pending & Open */}
        <div className="kanban-column">
          <div className="kanban-column-header col-open">
            <span className="status-indicator-dot open"></span>
            <h3>Pending & Open</h3>
            <span className="badge-count">{openTickets.length}</span>
          </div>
          <div className="kanban-column-list">
            {openTickets.length === 0 ? (
              <div className="empty-column-state">No open complaints</div>
            ) : (
              openTickets.map((ticket) => {
                const duplicates = tickets.filter(t => t.duplicate_of === ticket.id);
                return (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isNew={newTicketIds.has(ticket.id)}
                    duplicates={duplicates}
                    onStatusChange={handleStatusChange}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="kanban-column">
          <div className="kanban-column-header col-progress">
            <span className="status-indicator-dot progress"></span>
            <h3>In Progress</h3>
            <span className="badge-count">{inProgressTickets.length}</span>
          </div>
          <div className="kanban-column-list">
            {inProgressTickets.length === 0 ? (
              <div className="empty-column-state">No active investigations</div>
            ) : (
              inProgressTickets.map((ticket) => {
                const duplicates = tickets.filter(t => t.duplicate_of === ticket.id);
                return (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isNew={newTicketIds.has(ticket.id)}
                    duplicates={duplicates}
                    onStatusChange={handleStatusChange}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Resolved */}
        <div className="kanban-column">
          <div className="kanban-column-header col-resolved">
            <span className="status-indicator-dot resolved"></span>
            <h3>Resolved</h3>
            <span className="badge-count">{resolvedTickets.length}</span>
          </div>
          <div className="kanban-column-list">
            {resolvedTickets.length === 0 ? (
              <div className="empty-column-state">No resolved complaints</div>
            ) : (
              resolvedTickets.map((ticket) => {
                const duplicates = tickets.filter(t => t.duplicate_of === ticket.id);
                return (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isNew={newTicketIds.has(ticket.id)}
                    duplicates={duplicates}
                    onStatusChange={handleStatusChange}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket, isNew, duplicates, onStatusChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (ticket.status === 'resolved') {
      setTimeLeft('');
      return;
    }
    const updateTime = () => {
      const elapsed = Date.now() - new Date(ticket.created_at).getTime();
      const slaLimit = 24 * 60 * 60 * 1000;
      const remaining = slaLimit - elapsed;
      
      if (remaining <= 0) {
        setTimeLeft('SLA Breached');
      } else {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        setTimeLeft(`${h}h ${m}m left`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [ticket.created_at, ticket.status]);

  const urgencyBadgeClass = {
    urgent: 'badge-urgent',
    medium: 'badge-medium',
    low: 'badge-low',
  }[ticket.urgency] || 'badge-low';

  const urgencyLabel = {
    urgent: '🔴 Urgent',
    medium: '🟡 Medium',
    low: '🟢 Low',
  }[ticket.urgency] || ticket.urgency;

  const timeSince = getTimeSince(ticket.created_at);
  const isSlaBreached = timeLeft === 'SLA Breached';

  function handleStatusSelect(e) {
    e.stopPropagation();
    onStatusChange(ticket.id, e.target.value);
  }

  function toggleExpand(e) {
    // Prevent expanding if clicking interactive elements inside the card
    if (e.target.closest('.status-dropdown') || e.target.closest('.recording-link') || e.target.closest('.btn-map') || e.target.closest('.btn-toggle-transcript')) {
      return;
    }
    setIsExpanded(!isExpanded);
  }

  return (
    <div className="ticket-card-wrapper">
      <div 
        className={`ticket-card ${isNew ? 'is-new' : ''} ${ticket.source === 'emergency' ? 'is-emergency' : ''} ${isExpanded ? 'is-expanded' : ''}`} 
        onClick={toggleExpand}
      >
        {/* Card Header */}
        <div className="card-header">
          <span className="ticket-number">{ticket.ticket_number}</span>
          <div className="header-actions">
            <span className="source-icon-badge" title={`Filed via ${ticket.source}`}>
              {ticket.source === 'emergency' ? '🚨' : ticket.source === 'call' ? '📞' : '📝'}
            </span>
            {ticket.recording_url && (
              <a
                className="recording-link"
                href={ticket.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Listen to call recording"
                onClick={(e) => e.stopPropagation()}
              >
                🎧
              </a>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body">
          <div className="ticket-summary" title={ticket.summary}>
            {ticket.summary || '(No summary available)'}
          </div>
          <div className="ticket-location" title={ticket.location}>
            📍 {ticket.location || 'Not specified'}
          </div>
          <div className="ticket-time">
            🕒 {timeSince}
          </div>
        </div>

        {/* Card Badges */}
        <div className="card-badges">
          <span className={`badge ${urgencyBadgeClass}`}>{urgencyLabel}</span>

          {ticket.sentiment === 'angry' || ticket.sentiment === 'frustrated' ? (
            <span className="badge badge-sentiment" title="Angry/Frustrated Caller">
              {ticket.sentiment === 'angry' ? '💢 Angry' : '😡 Frustrated'}
            </span>
          ) : null}

          {duplicates && duplicates.length > 0 && (
            <span className="badge badge-duplicates" title="Similar complaints linked">
              +{duplicates.length} Similar
            </span>
          )}

          {ticket.status !== 'resolved' && (
            isSlaBreached ? (
              <span className="badge badge-sla flash-red">⚠️ SLA Breached</span>
            ) : (
              <span className={`badge ${timeLeft.includes('h ') && parseInt(timeLeft) < 4 ? 'badge-sla-warning' : 'badge-sla-safe'}`}>
                ⏳ {timeLeft}
              </span>
            )
          )}
        </div>

        {/* Card Footer */}
        <div className="card-footer">
          <span className="ticket-department-badge">{ticket.department}</span>
          <select
            className={`status-dropdown status-${ticket.status}`}
            value={ticket.status}
            onChange={handleStatusSelect}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
      </div>

      {/* Expandable Details Panel */}
      {isExpanded && (
        <div className={`ticket-details-panel ${ticket.source === 'emergency' ? 'is-emergency-panel' : ''}`}>
          {ticket.source === 'emergency' ? (
            <div className="details-group">
              <strong>Emergency GPS Location:</strong>
              <div className="location-info">
                Latitude: <code>{ticket.latitude}</code><br/>
                Longitude: <code>{ticket.longitude}</code>
              </div>
              {ticket.latitude && ticket.longitude && (
                <a 
                  href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-map"
                >
                  🗺️ Open in Google Maps
                </a>
              )}
            </div>
          ) : (
            <div className="details-group">
              <div className="transcript-header">
                <strong>{ticket.source === 'call' ? 'Transcript:' : 'Complaint Text:'}</strong>
                {ticket.source === 'call' && (
                  <button 
                    className="btn-toggle-transcript" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranscript(!showTranscript);
                    }}
                  >
                    {showTranscript ? 'Hide Full Text' : 'View Full Text'}
                  </button>
                )}
              </div>
              
              {(ticket.source !== 'call' || showTranscript) && (
                <p className="transcript-text">{ticket.raw_transcript || 'No transcript available.'}</p>
              )}
            </div>
          )}

          <div className="details-group">
            <strong>Classified Category:</strong>
            <p className="classified-label">{ticket.issue_type || 'General Grievance'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeSince(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
