'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function TriggerButton() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);

    try {
      // Get user's current location
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Create emergency record
          // @ts-ignore - Supabase type inference issue
          const { data, error } = await supabase
            .from('emergencies')
            .insert({
              patient_lat: latitude,
              patient_lon: longitude,
              status: 'active',
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating emergency:', error);
            toast.error('Failed to trigger emergency');
            setLoading(false);
          } else {
            toast.success('Emergency triggered!', {
              description: `Emergency ID: ${data.id.slice(0, 8)}...`,
            });

            // Start the agents
            try {
              await fetch('/api/emergency/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emergency_id: data.id }),
              });
            } catch (apiError) {
              console.error('Error starting agents:', apiError);
            }

            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get your location. Using default location.');

          // Fallback to UCI center
          const fallbackLat = 33.6405;
          const fallbackLon = -117.8443;

          supabase
            .from('emergencies')
            .insert({
              patient_lat: fallbackLat,
              patient_lon: fallbackLon,
              status: 'active',
            })
            .select()
            .single()
            .then(async ({ data, error }) => {
              if (error) {
                toast.error('Failed to trigger emergency');
                setLoading(false);
              } else {
                toast.success('Emergency triggered at default location!');

                // Start the agents
                try {
                  await fetch('/api/emergency/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emergency_id: data.id }),
                  });
                } catch (apiError) {
                  console.error('Error starting agents:', apiError);
                }

                setLoading(false);
              }
            });
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTrigger}
      disabled={loading}
      size="lg"
      className="bg-red-600 hover:bg-red-700 text-white font-bold"
    >
      <AlertCircle className="mr-2 h-5 w-5" />
      {loading ? 'Triggering...' : '🚨 TRIGGER EMERGENCY'}
    </Button>
  );
}
