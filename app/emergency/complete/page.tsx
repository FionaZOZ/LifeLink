'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, Clock } from 'lucide-react';

const timeline = [
  { time: '0:00', event: 'Emergency triggered' },
  { time: '0:05', event: '911 notified' },
  { time: '0:30', event: 'CPR started' },
  { time: '2:15', event: 'AED applied' },
  { time: '4:30', event: 'Ambulance arrived' },
];

export default function MissionComplete() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Emergency Complete</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center space-y-8">
          {/* Animated Checkmark */}
          <div className="flex justify-center mb-6">
            <div className="animate-bounce-in">
              <CheckCircle className="h-24 w-24 text-success" strokeWidth={2} />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gray-900">
              Patient handed to paramedics
            </h2>
            <p className="text-xl text-gray-600">You helped save a life today.</p>
          </div>

          {/* Timeline Card */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md text-left">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Timeline</h3>
            </div>

            <div className="space-y-4">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 text-sm font-mono text-gray-600">
                    {item.time}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 text-gray-900">{item.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={() => alert('Full report view (placeholder)')}
              className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Full Report
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-medical text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Done
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
