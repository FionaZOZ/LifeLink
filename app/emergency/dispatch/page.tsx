'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, MessageSquare, CheckCircle, Users } from 'lucide-react';
import AEDCard from '@/components/AEDCard';

interface EmergencyStatus {
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  notifications_sent: Array<{
    phone: string;
    method: 'call' | 'sms';
    status: 'calling' | 'sent' | 'accepted' | 'declined' | 'no_answer';
    name: string;
    distance: string;
    eta?: string;
  }>;
  volunteers_responded: number;
}

export default function DispatchStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<EmergencyStatus>({
    location: {
      lat: 33.6846,
      lng: -117.8265,
      address: '3200 California Ave, Irvine CA',
    },
    notifications_sent: [
      {
        phone: '+19495190927',
        method: 'call',
        status: 'calling',
        name: 'Volunteer A',
        distance: '150m away',
        eta: '2 min',
      },
      {
        phone: '+19493440799',
        method: 'sms',
        status: 'sent',
        name: 'Volunteer B',
        distance: '280m away',
        eta: '3 min',
      },
      {
        phone: '+19492223333',
        method: 'call',
        status: 'calling',
        name: 'Volunteer C',
        distance: '320m away',
        eta: '4 min',
      },
    ],
    volunteers_responded: 0,
  });

  useEffect(() => {
    // Poll backend for status updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/emergency/status');
        if (response.ok) {
          const data = await response.json();
          // Merge with hardcoded demo data
          setStatus((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch {
        console.log('Backend not available, using demo data');
      }
    }, 3000);

    // Simulate volunteer responses for demo
    const simulateResponses = setTimeout(() => {
      setStatus((prev) => ({
        ...prev,
        notifications_sent: prev.notifications_sent.map((notif, idx) => {
          if (idx === 0) {
            return { ...notif, status: 'accepted' as const };
          } else if (idx === 1) {
            return { ...notif, status: 'accepted' as const };
          }
          return notif;
        }),
        volunteers_responded: 2,
      }));
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(simulateResponses);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-success';
      case 'calling':
      case 'sent':
        return 'text-amber-500';
      case 'declined':
      case 'no_answer':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted ✓';
      case 'calling':
        return 'Calling...';
      case 'sent':
        return 'SMS Sent';
      case 'declined':
        return 'Declined';
      case 'no_answer':
        return 'No Answer';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Help is Coming</h1>
          <p className="text-sm text-gray-600 mt-1">Emergency response in progress</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Card 1: 911 Status */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-success">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🚑</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">911 Notified</h3>
              <p className="text-gray-600 mb-2">Emergency data sent to dispatch</p>
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Confirmed at {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Volunteers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-gray-700" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Volunteers</h3>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              {status.volunteers_responded}/{status.notifications_sent.length} responding
            </span>
          </div>

          {/* Volunteer List */}
          <div className="space-y-4">
            {status.notifications_sent.map((volunteer, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                {/* Method Icon */}
                <div className="flex-shrink-0">
                  {volunteer.method === 'call' ? (
                    <Phone className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{volunteer.name}</div>
                  <div className="text-sm text-gray-600">{volunteer.distance}</div>
                </div>

                {/* Status */}
                <div className="text-right">
                  <div className={`font-medium ${getStatusColor(volunteer.status)}`}>
                    {getStatusText(volunteer.status)}
                  </div>
                  {volunteer.status === 'accepted' && volunteer.eta && (
                    <div className="text-sm text-gray-600">ETA: {volunteer.eta}</div>
                  )}
                  {volunteer.status === 'calling' && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <span className="animate-pulse inline-block w-2 h-2 bg-amber-600 rounded-full"></span>
                      <span className="text-xs">Ringing</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: AED Located */}
        <AEDCard />

        {/* CTA Button */}
        <button
          onClick={() => router.push('/emergency/cpr')}
          className="w-full bg-emergency text-white font-bold py-4 px-6 rounded-lg hover:bg-emergency-dark transition-colors text-lg shadow-lg"
        >
          Start CPR Guidance →
        </button>
      </main>
    </div>
  );
}
