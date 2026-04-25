'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-600" fill="currentColor" />
          <h1 className="text-2xl font-bold text-gray-900">CardiacLink</h1>
        </div>
        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">U</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Emergency Button */}
        <button
          onClick={() => router.push('/emergency/location')}
          className="w-64 h-64 rounded-full bg-emergency text-white font-bold text-2xl shadow-2xl hover:bg-emergency-dark transition-all animate-pulse-slow flex items-center justify-center"
          aria-label="Emergency button"
        >
          EMERGENCY
        </button>

        <p className="mt-6 text-sm text-gray-500">For cardiac emergencies only</p>

        {/* Bottom Cards */}
        <div className="mt-16 flex gap-6">
          <div className="flex flex-col items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-700">CPR Tutorial</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">My Profile</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Settings</span>
          </div>
        </div>
      </main>
    </div>
  );
}
