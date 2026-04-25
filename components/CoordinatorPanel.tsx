'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';

interface CoordinatorPanelProps {
  emergencyId: string | null;
}

export function CoordinatorPanel({ emergencyId }: CoordinatorPanelProps) {
  const [log, setLog] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emergencyId) {
      setLog([]);
      setIsActive(false);
      return;
    }

    setIsActive(true);
    setLog(['🧠 Coordinator initializing...', '']);

    // Connect to SSE stream
    const eventSource = new EventSource(
      `/api/emergency/start?emergency_id=${emergencyId}`
    );

    // Note: We need to trigger the POST, not GET. Let me fix this approach.
    eventSource.close();

    // Use fetch with streaming instead
    fetch('/api/emergency/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emergency_id: emergencyId }),
    }).then(async (response) => {
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));

            if (data.type === 'text') {
              setLog((prev) => {
                const newLog = [...prev];
                newLog[newLog.length - 1] += data.content;
                return newLog;
              });
            } else if (data.type === 'done') {
              setLog((prev) => [...prev, '', '✅ Coordination complete']);
              setIsActive(false);
            } else if (data.type === 'error') {
              setLog((prev) => [...prev, '', `❌ Error: ${data.message}`]);
              setIsActive(false);
            }
          }
        }
      }
    }).catch((error) => {
      console.error('Coordinator stream error:', error);
      setLog((prev) => [...prev, '', `❌ Connection error: ${error.message}`]);
      setIsActive(false);
    });
  }, [emergencyId]);

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  return (
    <Card className={`h-full ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3 bg-black text-green-400">
        <div className="flex items-center gap-2">
          <Brain className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
          <CardTitle className="text-base font-mono">
            Coordinator {isActive && '(ACTIVE)'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-black text-green-400 font-mono text-xs p-4 h-48 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-gray-600">Waiting for emergency trigger...</p>
          ) : (
            log.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {line}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
