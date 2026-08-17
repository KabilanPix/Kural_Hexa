import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite asset paths for Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Demo fallback coordinates for Chennai locations
const LOCATION_COORDS = {
  'ambattur': [13.1146, 80.1548],
  'vaishnavi nagar': [13.1250, 80.1600],
  'guindy': [13.0067, 80.2206],
  'adyar': [13.0063, 80.2574],
  'velachery': [12.9802, 80.2228],
  'anna nagar': [13.0850, 80.2101],
};

const DEPARTMENT_ICONS = {
  'Sanitation': '🗑️',
  'Water Supply': '💧',
  'Electricity': '⚡',
  'Roads & Infrastructure': '🚧',
  'Health Services': '🏥',
  'Police': '👮',
  'Fire Department': '🚒',
  'General Grievance': '📋',
};

const DEPARTMENT_COLORS = {
  'Sanitation': '#64748b', // Slate
  'Water Supply': '#0284c7', // Sky Blue
  'Electricity': '#d97706', // Amber
  'Roads & Infrastructure': '#7c2d12', // Rust Brown
  'Health Services': '#e11d48', // Crimson Red
  'Police': '#1e3a8a', // Dark Navy
  'Fire Department': '#ea580c', // Orange-red
  'General Grievance': '#475569', // Slate 600
};

function getCoordinates(ticket) {
  // 1. Check if ticket has explicit coordinates in database
  if (ticket.latitude && ticket.longitude) {
    const lat = parseFloat(ticket.latitude);
    const lng = parseFloat(ticket.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }

  // 2. Check location string mapping
  if (ticket.location && ticket.location !== 'Not specified') {
    const locLower = ticket.location.toLowerCase();
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
      if (locLower.includes(key)) {
        // Add minor jitter so markers on the same location don't overlap completely
        const jitterLat = (Math.random() - 0.5) * 0.003;
        const jitterLng = (Math.random() - 0.5) * 0.003;
        return [coords[0] + jitterLat, coords[1] + jitterLng];
      }
    }
  }

  // 3. General fallback centered in Chennai with random jitter
  const jitterLat = (Math.random() - 0.5) * 0.08;
  const jitterLng = (Math.random() - 0.5) * 0.08;
  return [13.0827 + jitterLat, 80.2707 + jitterLng];
}

export default function MapView({ tickets }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapContainerRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([13.0827, 80.2707], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Cleanup function on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when tickets change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    const activeTickets = tickets.filter(t => t.status !== 'resolved');

    activeTickets.forEach(ticket => {
      const coords = getCoordinates(ticket);
      if (!coords) return;

      const isEmergency = ticket.source === 'emergency';
      const dept = ticket.department || 'General Grievance';
      const iconEmoji = isEmergency ? '🚨' : (DEPARTMENT_ICONS[dept] || '📍');
      const markerColor = isEmergency ? '#ef4444' : (DEPARTMENT_COLORS[dept] || '#0c5c32');

      // Custom icon representing the category with specific background colors
      const customIcon = L.divIcon({
        className: `custom-map-marker ${isEmergency ? 'pulse-emergency' : ''}`,
        html: `<div class="marker-pin-circle" style="background-color: ${markerColor};">${iconEmoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
      });

      const popupContent = `
        <div class="map-popup">
          <div class="popup-header">
            <span class="popup-ticket-id">${ticket.ticket_number}</span>
            <span class="popup-source">${ticket.source === 'emergency' ? '🚨 EMERGENCY' : '📝 Triage'}</span>
          </div>
          <div class="popup-body">
            <p><strong>Summary:</strong> ${ticket.summary || '(no summary)'}</p>
            <p><strong>Department:</strong> ${ticket.department}</p>
            <p><strong>Location:</strong> ${ticket.location || 'Not specified'}</p>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(mapInstanceRef.current);

      markersRef.current.push(marker);
    });

  }, [tickets]);

  return (
    <div className="map-view-card">
      <div className="map-header">
        <h3>📍 Live Grievance Map</h3>
        <span className="map-badge">Live Tracking</span>
      </div>
      <div ref={mapContainerRef} className="map-container" style={{ height: '350px', width: '100%', borderRadius: '8px' }} />
    </div>
  );
}
