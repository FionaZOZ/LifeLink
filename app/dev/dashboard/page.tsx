'use client';

// Developer Dashboard - Monitor CardiacLink runtimes (Next.js, FastAPI, Fetch.ai bus)
// Shows health status, agent activity, live events, and manual testing controls

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceHealth {
  status: string;
  error?: string;
  version?: string;
  uptime_s?: number;
  agents?: AgentInfo[];
  [key: string]: any;
}

interface AgentInfo {
  name: string;
  address: string;
  capability: string;
  last_heartbeat?: string;
}

interface AggregatedHealth {
  next: ServiceHealth;
  backend: ServiceHealth;
  bus: ServiceHealth;
}

interface BusEvent {
  ts: string;
  emergency_id: string;
  agent: string;
  capability: string;
  phase: string;
  summary: string;
  data?: any;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function DevDashboard() {
  const [health, setHealth] = useState<AggregatedHealth | null>(null);
  const [emergencies, setEmergencies] = useState<string[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<string>('all');
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [testResponse, setTestResponse] = useState<string>('');

  // Fetch health status
  const fetchHealth = async () => {
    if (isPaused) return;
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  // Fetch emergencies list
  const fetchEmergencies = async () => {
    if (isPaused) return;
    try {
      const busUrl = process.env.NEXT_PUBLIC_BUS_EVENT_URL || 'http://localhost:8010';
      const res = await fetch(`${busUrl}/emergencies`);
      const data = await res.json();
      setEmergencies(data.emergencies || []);
    } catch (error) {
      console.error('Failed to fetch emergencies:', error);
    }
  };

  // Subscribe to bus events (for all emergencies or a specific one)
  useEffect(() => {
    if (isPaused) return;

    const busUrl = process.env.NEXT_PUBLIC_BUS_EVENT_URL || 'http://localhost:8010';
    const emergencyId = selectedEmergency === 'all' ? 'heartbeat' : selectedEmergency;

    const eventSource = new EventSource(`${busUrl}/events/${emergencyId}`);

    eventSource.onmessage = (e) => {
      try {
        const event: BusEvent = JSON.parse(e.data);
        setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedEmergency, isPaused]);

  // Auto-refresh health and emergencies every 3 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      fetchHealth();
      fetchEmergencies();
    }, 3000);

    // Initial fetch
    fetchHealth();
    fetchEmergencies();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // Manual test triggers
  const triggerEmergency = async () => {
    const emergencyId = `test-${Date.now()}`;
    try {
      const res = await fetch('/api/emergency/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergency_id: emergencyId }),
      });
      const data = await res.json();
      setTestResponse(`✓ Emergency triggered: ${emergencyId}\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setTestResponse(`✗ Failed: ${error.message}`);
    }
  };

  const triggerBackendEmergency = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: 34.0689,
          lng: -118.4452,
          address: 'Royce Hall, UCLA',
        }),
      });
      const data = await res.json();
      setTestResponse(`✓ Backend emergency triggered\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setTestResponse(`✗ Failed: ${error.message}`);
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    if (status === 'ok') return <Badge className="bg-green-500">OK</Badge>;
    if (status === 'timeout') return <Badge className="bg-yellow-500">Timeout</Badge>;
    if (status === 'unreachable') return <Badge className="bg-red-500">Unreachable</Badge>;
    return <Badge className="bg-gray-500">{status}</Badge>;
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (!eventFilter) return true;
    const searchStr = eventFilter.toLowerCase();
    return (
      event.agent.toLowerCase().includes(searchStr) ||
      event.summary.toLowerCase().includes(searchStr) ||
      event.phase.toLowerCase().includes(searchStr)
    );
  });

  // Check for dev key in production - after all hooks
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const devKey = params.get('devKey');
    if (devKey !== process.env.NEXT_PUBLIC_DEV_DASHBOARD_KEY) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
          <Card className="max-w-md border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-100">Access Denied</CardTitle>
              <CardDescription className="text-zinc-400">
                This dashboard is not available in production without a valid dev key.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CardiacLink Developer Dashboard</h1>
            <p className="text-zinc-400">Runtime monitoring and testing controls</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isPaused ? 'default' : 'outline'}
              onClick={() => setIsPaused(!isPaused)}
              className="border-zinc-700"
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEvents([]);
                setTestResponse('');
              }}
              className="border-zinc-700"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Next.js</CardTitle>
                {health && getStatusBadge(health.next.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Version: {health?.next.version || '—'}
              </p>
              <p className="text-sm text-zinc-400">Env: {health?.next.env || '—'}</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">FastAPI Backend</CardTitle>
                {health && getStatusBadge(health.backend.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Uptime: {health?.backend.uptime_s?.toFixed(0) || '—'}s
              </p>
              <p className="text-sm text-zinc-400">
                Twilio: {health?.backend.twilio_configured ? '✓' : '✗'}
              </p>
              {health?.backend.error && (
                <p className="text-sm text-red-400">{health.backend.error}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Fetch.ai Bus</CardTitle>
                {health && getStatusBadge(health.bus.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Agents: {health?.bus.agents?.length || 0}
              </p>
              <p className="text-sm text-zinc-400">
                Uptime: {health?.bus.uptime_s?.toFixed(0) || '—'}s
              </p>
              {health?.bus.error && (
                <p className="text-sm text-red-400">{health.bus.error}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        {health?.bus.agents && health.bus.agents.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription className="text-zinc-400">
                8 specialist agents registered with the bus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {health.bus.agents.map((agent) => (
                  <div
                    key={agent.name}
                    className="rounded border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-mono text-sm font-semibold">{agent.name}</p>
                      <Badge className="bg-zinc-700 text-xs">
                        {agent.capability || 'unknown'}
                      </Badge>
                    </div>
                    <p className="mb-1 font-mono text-xs text-zinc-500">
                      {agent.address.slice(0, 16)}...
                    </p>
                    {agent.last_heartbeat && (
                      <p className="text-xs text-zinc-600">
                        {new Date(agent.last_heartbeat).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Triggers */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle>Manual Test Triggers</CardTitle>
            <CardDescription className="text-zinc-400">
              Trigger emergency flows manually for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={triggerEmergency} className="bg-zinc-700 hover:bg-zinc-600">
                  POST /api/emergency/start
                </Button>
                <Button onClick={triggerBackendEmergency} className="bg-zinc-700 hover:bg-zinc-600">
                  POST backend/api/emergency/trigger
                </Button>
              </div>
              {testResponse && (
                <pre className="rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                  {testResponse}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Bus Events</CardTitle>
                <CardDescription className="text-zinc-400">
                  Last 50 events from the Fetch.ai bus
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedEmergency}
                  onChange={(e) => setSelectedEmergency(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-100"
                >
                  <option value="all">All Emergencies</option>
                  <option value="heartbeat">Heartbeats Only</option>
                  {emergencies.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  placeholder="Filter events..."
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-64 border-zinc-700 bg-zinc-800"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filteredEvents.length === 0 && (
                <p className="text-center text-zinc-500">No events yet</p>
              )}
              {filteredEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs"
                >
                  <div className="flex-shrink-0">
                    <Badge
                      className={
                        event.phase === 'heartbeat'
                          ? 'bg-zinc-700'
                          : event.phase === 'error'
                          ? 'bg-red-600'
                          : event.phase === 'result'
                          ? 'bg-green-600'
                          : 'bg-blue-600'
                      }
                    >
                      {event.phase}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-zinc-100">{event.agent}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-400">{event.capability}</span>
                    </div>
                    <p className="text-zinc-300">{event.summary}</p>
                    <p className="mt-1 text-zinc-600">
                      {new Date(event.ts).toLocaleTimeString()} · {event.emergency_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
