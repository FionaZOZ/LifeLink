'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the map component with SSR disabled (Leaflet doesn't work with SSR)
const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false });

export default function LocationConfirmation() {
  const router = useRouter();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address] = useState('3200 California Ave, Irvine CA');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Location page mounted');
    // Get user's location
    if (navigator.geolocation) {
      console.log('Getting geolocation...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got location:', position.coords);
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Irvine CA
          console.log('Using default location');
          setLocation({ lat: 33.6846, lng: -117.8265 });
          setLoading(false);
        }
      );
    } else {
      console.log('Geolocation not available, using default');
      setLocation({ lat: 33.6846, lng: -117.8265 });
      setLoading(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!location) return;

    try {
      // Call backend API to trigger emergency
      const response = await fetch('http://localhost:8000/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          address: address,
        }),
      });

      if (response.ok) {
        router.push('/emergency/dispatch');
      } else {
        console.error('Failed to trigger emergency');
        // Still navigate for demo purposes
        router.push('/emergency/dispatch');
      }
    } catch (error) {
      console.error('Error triggering emergency:', error);
      // Still navigate for demo purposes
      router.push('/emergency/dispatch');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Bar */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step 1 of 3</span>
            <span className="text-sm text-gray-600">Confirm Location</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div className="bg-medical h-2 rounded-full" style={{ width: '33%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        {/* Map Section - 60% of page height */}
        <div className="rounded-lg overflow-hidden relative mb-6 shadow-lg border-2 border-gray-300" style={{ height: '60vh', width: '100%' }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-gray-500">Loading location...</div>
            </div>
          ) : location ? (
            <LocationMap
              center={[location.lat, location.lng]}
              address={address}
            />
          ) : null}

          {/* Coordinate overlay */}
          {location && (
            <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg text-xs font-mono border border-gray-200 z-20">
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Address Display */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-6 w-6 text-emergency flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{address}</h3>

              {/* Landmark chips */}
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  Near Starbucks
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  Near CVS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={!location}
            className="w-full bg-medical text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            Confirm Location
          </button>

          <button
            onClick={() => alert('Drag pin to adjust (demo feature)')}
            className="w-full bg-white text-medical font-medium py-3 px-6 rounded-lg border-2 border-medical hover:bg-blue-50 transition-colors"
          >
            Adjust Location
          </button>
        </div>
      </main>
    </div>
  );
}
