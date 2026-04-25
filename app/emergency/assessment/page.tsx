'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function CPRAssessment() {
  const router = useRouter();
  const [breathing, setBreathing] = useState<boolean | null>(null);
  const [responsive, setResponsive] = useState<boolean | null>(null);

  const handleContinue = () => {
    if (breathing === false && responsive === false) {
      // Continue CPR
      router.push('/emergency/cpr');
    } else if (breathing === true || responsive === true) {
      // Recovery position
      alert('Place patient in recovery position. Stay with them until help arrives.');
      // Could navigate to a recovery screen
    }
  };

  const canContinue = breathing !== null && responsive !== null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Check the Patient</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pause compressions briefly and check for signs of life
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Question 1: Breathing */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Is the patient breathing normally?
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setBreathing(true)}
                className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  breathing === true
                    ? 'bg-success text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setBreathing(false)}
                className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  breathing === false
                    ? 'bg-emergency text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Question 2: Responsive */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Is the patient responsive?
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setResponsive(true)}
                className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  responsive === true
                    ? 'bg-success text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setResponsive(false)}
                className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                  responsive === false
                    ? 'bg-emergency text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Continue Button */}
          {canContinue && (
            <button
              onClick={handleContinue}
              className={`w-full py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all ${
                breathing === false && responsive === false
                  ? 'bg-emergency hover:bg-emergency-dark text-white'
                  : 'bg-success hover:bg-green-700 text-white'
              }`}
            >
              {breathing === false && responsive === false
                ? 'Continue CPR →'
                : 'Patient Responding →'}
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 max-w-2xl w-full">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              <strong>Volunteer arriving in 45 seconds</strong> — they can take over compressions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
