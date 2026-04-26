'use client';

import { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl } from 'react-map-gl/mapbox';
import { MapPin, Heart, Zap } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface EmergencyMapProps {
  patientLocation?: { lat: number; lon: number };
  volunteers: Array<{ id: string; lat: number; lon: number; name: string }>;
  aeds: Array<{ id: string; lat: number; lon: number; location_name: string | null }>;
}

export function EmergencyMap({ patientLocation, volunteers, aeds }: EmergencyMapProps) {
  const mapRef = useRef<any>(null);

  const defaultCenter = {
    latitude: 33.6405,
    longitude: -117.8443,
    zoom: 13,
  };

  useEffect(() => {
    // If there's a patient location, fit bounds to show patient + nearby markers
    if (patientLocation && mapRef.current) {
      const map = mapRef.current.getMap();
      map.flyTo({
        center: [patientLocation.lon, patientLocation.lat],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [patientLocation]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border">
      <Map
        ref={mapRef}
        initialViewState={defaultCenter}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {/* Patient location (if emergency active) */}
        {patientLocation && (
          <Marker
            latitude={patientLocation.lat}
            longitude={patientLocation.lon}
            anchor="bottom"
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-red-500 rounded-full animate-ping opacity-75" />
              <div className="relative bg-red-600 p-2 rounded-full shadow-lg">
                <Heart className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
          </Marker>
        )}

        {/* Volunteers */}
        {volunteers.map((volunteer) => (
          <Marker
            key={volunteer.id}
            latitude={volunteer.lat}
            longitude={volunteer.lon}
            anchor="bottom"
          >
            <div className="bg-blue-600 p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition">
              <MapPin className="h-4 w-4 text-white" fill="white" />
            </div>
          </Marker>
        ))}

        {/* AEDs */}
        {aeds.map((aed) => (
          <Marker
            key={aed.id}
            latitude={aed.lat}
            longitude={aed.lon}
            anchor="bottom"
          >
            <div className="bg-yellow-500 p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-yellow-600 transition">
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
