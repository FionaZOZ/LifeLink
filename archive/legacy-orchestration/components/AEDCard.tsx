'use client';

import { useState } from 'react';
import { Zap, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Dynamically import the map component with SSR disabled
const AEDMap = dynamic(() => import('@/components/AEDMap'), { ssr: false });

interface AEDLocation {
  name: string;
  distance: number; // meters
  instructions: string;
  coordinates: [number, number];
}

const AED_LOCATIONS: AEDLocation[] = [
  {
    name: '24 Hour Fitness lobby',
    distance: 180,
    instructions: 'Left wall past front desk, red cabinet',
    coordinates: [33.6870, -117.8230],
  },
  {
    name: 'Irvine Civic Center',
    distance: 350,
    instructions: 'Main entrance, right side',
    coordinates: [33.6810, -117.8290],
  },
  {
    name: 'Northwood High School',
    distance: 500,
    instructions: 'Gym entrance, glass case',
    coordinates: [33.6900, -117.8200],
  },
];

const PATIENT_LOCATION: [number, number] = [33.6846, -117.8265];

// Hardcode volunteer positions near AEDs
const VOLUNTEER_POSITIONS: [number, number][] = [
  [33.6865, -117.8240], // Near 24 Hour Fitness
  [33.6815, -117.8280], // Near Civic Center
];

export default function AEDCard() {
  const [aedRetrieved, setAedRetrieved] = useState(false);

  const handleRetrieveAED = () => {
    setAedRetrieved(true);
    toast.success('AED is on the way to the patient');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Zap className="h-8 w-8 text-yellow-500 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">AED Located</h3>
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
        </div>
      </div>

      {/* AED List */}
      <div className="space-y-3 mb-4">
        {AED_LOCATIONS.map((aed, idx) => {
          const isClosest = idx === 0;
          const isGrayedOut = aedRetrieved && !isClosest;

          return (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 transition-all ${
                isClosest && !aedRetrieved
                  ? 'border-success bg-green-50'
                  : isGrayedOut
                    ? 'border-gray-200 bg-gray-50 opacity-50'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{aed.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{aed.distance}m away</div>
                  <div className="text-sm text-gray-500 mt-1 italic">{aed.instructions}</div>
                </div>
              </div>

              {/* Status badge for first AED */}
              {isClosest && !aedRetrieved && (
                <div className="mt-3 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  🏃 Volunteer en route to retrieve — ETA 2 min
                </div>
              )}

              {isClosest && aedRetrieved && (
                <div className="mt-3 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  AED Retrieved
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini Map */}
      <div className="w-full h-[250px] rounded-lg overflow-hidden border-2 border-gray-300 mb-3">
        <AEDMap
          patientLocation={PATIENT_LOCATION}
          aedLocations={AED_LOCATIONS.map((aed) => aed.coordinates)}
          volunteerPositions={VOLUNTEER_POSITIONS}
          aedRetrieved={aedRetrieved}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-600 rounded-full"></span>
          <span>Patient</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-blue-600 rounded-full"></span>
          <span>AED</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-600 rounded-full"></span>
          <span>Volunteer</span>
        </div>
      </div>

      {/* Demo Button */}
      {!aedRetrieved && (
        <button
          onClick={handleRetrieveAED}
          className="w-full bg-success text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          I Got the AED ✓
        </button>
      )}
    </div>
  );
}
