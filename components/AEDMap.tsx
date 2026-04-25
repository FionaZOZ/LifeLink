'use client';

import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface AEDMapProps {
  patientLocation: [number, number];
  aedLocations: [number, number][];
  volunteerPositions: [number, number][];
  aedRetrieved: boolean;
}

export default function AEDMap({
  patientLocation,
  aedLocations,
  volunteerPositions,
  aedRetrieved,
}: AEDMapProps) {
  // Calculate bounds to fit all markers
  const allPoints = [patientLocation, ...aedLocations, ...volunteerPositions];
  const bounds = L.latLngBounds(allPoints);
  const center: [number, number] = [
    bounds.getCenter().lat,
    bounds.getCenter().lng,
  ];

  // Route: nearest volunteer -> nearest AED -> patient
  const nearestVolunteer = volunteerPositions[0];
  const nearestAED = aedLocations[0];

  // Route segments
  const volunteerToAEDRoute: [number, number][] = [nearestVolunteer, nearestAED];
  const aedToPatientRoute: [number, number][] = [nearestAED, patientLocation];

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Patient Location - Red Circle */}
      <CircleMarker
        center={patientLocation}
        radius={10}
        pathOptions={{
          color: '#991B1B',
          fillColor: '#DC2626',
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Popup>
          <strong>Patient Location</strong>
          <br />
          Emergency in progress
        </Popup>
      </CircleMarker>

      {/* AED Locations - Blue Circles */}
      {aedLocations.map((location, idx) => (
        <CircleMarker
          key={`aed-${idx}`}
          center={location}
          radius={8}
          pathOptions={{
            color: '#1E40AF',
            fillColor: '#3B82F6',
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <strong>AED Location {idx + 1}</strong>
            <br />
            {idx === 0 ? '24 Hour Fitness' : idx === 1 ? 'Civic Center' : 'High School'}
          </Popup>
        </CircleMarker>
      ))}

      {/* Volunteer Positions - Green Circles */}
      {volunteerPositions.map((position, idx) => (
        <CircleMarker
          key={`volunteer-${idx}`}
          center={position}
          radius={8}
          pathOptions={{
            color: '#15803D',
            fillColor: '#22C55E',
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <strong>Volunteer {idx + 1}</strong>
            <br />
            En route to retrieve AED
          </Popup>
        </CircleMarker>
      ))}

      {/* Dashed Polyline Routes */}
      {!aedRetrieved && (
        <>
          {/* Volunteer to AED - Blue dashed line */}
          <Polyline
            positions={volunteerToAEDRoute}
            pathOptions={{
              color: '#3B82F6',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
          {/* AED to Patient - Blue dashed line */}
          <Polyline
            positions={aedToPatientRoute}
            pathOptions={{
              color: '#3B82F6',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
        </>
      )}

      {/* If AED retrieved, only show AED to patient route */}
      {aedRetrieved && (
        <Polyline
          positions={aedToPatientRoute}
          pathOptions={{
            color: '#22C55E',
            weight: 4,
            opacity: 0.9,
            dashArray: '10, 10',
          }}
        />
      )}
    </MapContainer>
  );
}
