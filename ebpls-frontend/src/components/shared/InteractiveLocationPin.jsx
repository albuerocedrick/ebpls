// src/components/shared/InteractiveLocationPin.jsx

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, GeoJSON } from 'react-leaflet';
import { MapPin, Info } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geojsonData } from '../../utils/geoValidation';

// Fix for React-Leaflet missing default marker icon issue
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default coordinates for Municipality of Liliw, Laguna
const LILIW_CENTER = { lat: 14.1297, lng: 121.4326 };

/**
 * Helper component to catch map click events and place a marker.
 */
const LocationMarker = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      if (onChange) {
        onChange({
          lat: parseFloat(e.latlng.lat.toFixed(7)),
          lng: parseFloat(e.latlng.lng.toFixed(7))
        });
      }
    },
  });

  return position && position.lat && position.lng ? (
    <Marker position={[position.lat, position.lng]} icon={defaultIcon} />
  ) : null;
};

/**
 * Interactive map component for pinning business locations.
 * @param {Object} value - Current position { lat, lng }
 * @param {Function} onChange - Callback receiving { lat, lng }
 */
const InteractiveLocationPin = ({ value, onChange }) => {
  // Memoize center to prevent map re-centering on every render
  // If value exists, center there; otherwise fallback to Liliw.
  const initialCenter = useMemo(() => {
    return value && value.lat && value.lng
      ? [value.lat, value.lng]
      : [LILIW_CENTER.lat, LILIW_CENTER.lng];
  }, []);

  return (
    <div className="flex flex-col border border-[hsl(var(--color-border,0,0%,90%))] rounded-lg overflow-hidden bg-[hsl(var(--color-surface,0,0%,100%))]">
      
      {/* Header / Instructions */}
      <div className="bg-[hsl(var(--color-surface-raised,0,0%,96%))] p-3 border-b border-[hsl(var(--color-border,0,0%,90%))] flex items-start gap-3">
        <div className="p-1.5 bg-accent/10 rounded-md text-accent shrink-0">
          <MapPin size={18} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[hsl(var(--color-text,0,0%,10%))]">Pin Business Location</h4>
          <p className="text-xs text-[hsl(var(--color-text-muted,0,0%,40%))] mt-0.5 flex items-center gap-1">
            <Info size={12} />
            Tap anywhere on the map to set the exact coordinates of the establishment.
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-64 w-full relative z-0">
        <MapContainer 
          center={initialCenter} 
          zoom={15} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON 
            data={geojsonData} 
            style={{ color: '#3b82f6', weight: 2, fillOpacity: 0.1 }} 
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.name || feature.properties?.ADM4_EN;
              if (name) {
                layer.bindTooltip(name, {
                  permanent: true,
                  direction: 'center',
                  className: '!bg-transparent !border-none !shadow-none text-[10px] font-bold text-blue-900 drop-shadow-md'
                });
              }
            }}
          />
          <LocationMarker position={value} onChange={onChange} />
        </MapContainer>
      </div>

      {/* Footer / Coordinate Readout */}
      <div className="p-2.5 bg-[hsl(var(--color-surface-raised,0,0%,96%))] border-t border-[hsl(var(--color-border,0,0%,90%))] text-xs text-center flex justify-between px-4">
        <span className="text-[hsl(var(--color-text-muted,0,0%,40%))] font-medium">Selected Coordinates:</span>
        <span className="text-[hsl(var(--color-text,0,0%,10%))] font-mono">
          {value && value.lat && value.lng 
            ? `${value.lat}, ${value.lng}` 
            : 'Not Set'}
        </span>
      </div>

    </div>
  );
};

export default InteractiveLocationPin;