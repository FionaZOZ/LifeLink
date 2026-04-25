'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { supabase } from '@/lib/supabase/client';
import type { AgentEvent } from '@/lib/supabase/types';

interface CPRQRCodeProps {
  emergencyId: string | null;
}

export function CPRQRCode({ emergencyId }: CPRQRCodeProps) {
  const [cprUrl, setCprUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!emergencyId) {
      setCprUrl(null);
      return;
    }

    // Subscribe to agent events for CPR URL
    const channel = supabase
      .channel(`cpr-qr-${emergencyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: `emergency_id=eq.${emergencyId}`,
        },
        (payload) => {
          const event = payload.new as AgentEvent;
          if (
            event.agent_name === 'cpr' &&
            event.event_type === 'cpr_url_generated' &&
            event.payload?.url
          ) {
            setCprUrl(event.payload.url as string);
          }
        }
      )
      .subscribe();

    // Fetch existing URL if already generated
    supabase
      .from('agent_events')
      .select('*')
      .eq('emergency_id', emergencyId)
      .eq('agent_name', 'cpr')
      .eq('event_type', 'cpr_url_generated')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          const event = data as AgentEvent;
          if (event.payload && typeof event.payload === 'object' && 'url' in event.payload) {
            setCprUrl(event.payload.url as string);
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [emergencyId]);

  if (!cprUrl) {
    return null;
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900">
          CPR Coach - Scan with Phone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <QRCodeSVG value={cprUrl} size={180} level="H" />
        </div>
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Place phone on patient&apos;s chest for real-time compression feedback
        </p>
      </CardContent>
    </Card>
  );
}
