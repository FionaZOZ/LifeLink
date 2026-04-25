'use client';

import { useState } from 'react';
import { MapPin, Zap, Navigation } from 'lucide-react';

export default function VolunteerMap() {
  const [aedRetrieved, setAedRetrieved] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Map Section - Full screen */}
      <div className="flex-1 relative bg-gradient-to-br from-blue-100 via-green-50 to-blue-50">
        {/* Map content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-6xl">
            {/* Patient pin - center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <MapPin className="h-12 w-12 text-emergency" fill="currentColor" />
              <span className="mt-1 px-2 py-1 bg-white rounded shadow text-xs font-medium">
                Patient
              </span>
            </div>

            {/* AED pin - top right */}
            <div className="absolute top-1/3 right-1/3 flex flex-col items-center">
              <Zap className="h-10 w-10 text-yellow-500" fill="currentColor" />
              <span className="mt-1 px-2 py-1 bg-white rounded shadow text-xs font-medium">
                24 Hour Fitness
              </span>
            </div>

            {/* Volunteer dots */}
            <div className="absolute top-2/5 left-2/5 flex flex-col items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
              <span className="mt-1 px-2 py-1 bg-white rounded shadow text-xs">
                Going to patient
              </span>
            </div>

            <div className="absolute top-1/3 right-1/3 transform translate-x-4 translate-y-8 flex flex-col items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
              <span className="mt-1 px-2 py-1 bg-white rounded shadow text-xs">
                Getting AED
              </span>
            </div>

            {/* Dotted route line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="40%"
                y1="60%"
                x2="50%"
                y2="50%"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        </div>

        {/* Top card - floating */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6">
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">AED at 24 Hour Fitness</h3>
                <p className="text-sm text-gray-600 mt-1">180m away — 2 min walk</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <Navigation className="h-4 w-4" />
                  <span>Walking directions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6">
          {!aedRetrieved ? (
            <button
              onClick={() => setAedRetrieved(true)}
              className="w-full bg-success text-white font-bold py-4 px-6 rounded-lg shadow-2xl hover:bg-green-700 transition-all"
            >
              I Got the AED ✓
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-success">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">AED Retrieved ✓</h4>
                  <p className="text-sm text-gray-600">Head to patient</p>
                </div>
                <Navigation className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
