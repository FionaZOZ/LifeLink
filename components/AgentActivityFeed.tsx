'use client';

import { useEffect, useRef } from 'react';
import type { AgentEvent } from '@/lib/useEmergencyTelemetry';

const AGENT_COLORS: Record<string, string> = {
  Coordinator: 'text-blue-400',
  AED: 'text-yellow-400',
  EMS: 'text-red-400',
  Drone: 'text-cyan-400',
  Triage: 'text-purple-400',
  Handoff: 'text-green-400',
  Voice: 'text-pink-400',
  Optimizer: 'text-orange-400',
};

const AGENT_ICONS: Record<string, string> = {
  Coordinator: '🧠',
  AED: '⚡',
  EMS: '🚑',
  Drone: '🛸',
  Triage: '🏥',
  Handoff: '📋',
  Voice: '🎙️',
  Optimizer: '📊',
};

// ── Cluster type for grouping parallel events ──────────────────────────────

type Cluster =
  | { kind: 'single'; event: AgentEvent }
  | { kind: 'parallel'; groupId: string; events: AgentEvent[] };

function buildClusters(events: AgentEvent[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const ev of events) {
    if (ev.parallelGroupId) {
      const last = clusters[clusters.length - 1];
      if (last && last.kind === 'parallel' && last.groupId === ev.parallelGroupId) {
        last.events.push(ev);
      } else {
        clusters.push({ kind: 'parallel', groupId: ev.parallelGroupId, events: [ev] });
      }
    } else {
      clusters.push({ kind: 'single', event: ev });
    }
  }
  return clusters;
}

// ── Single event row ──────────────────────────────────────────────────────

function SingleEventRow({ event, index }: { event: AgentEvent; index: number }) {
  const color = AGENT_COLORS[event.agent] || 'text-zinc-400';
  const icon = AGENT_ICONS[event.agent] || '🔹';
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className="flex items-start gap-2 px-3 py-1.5 rounded-md bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors animate-in slide-in-from-left-2 duration-300"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <span className="text-sm shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-semibold ${color}`}>
            {event.agent}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{time}</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed break-words">
          {event.message}
        </p>
      </div>
    </div>
  );
}

// ── Feed component ─────────────────────────────────────────────────────────

interface AgentActivityFeedProps {
  events: AgentEvent[];
  className?: string;
}

export function AgentActivityFeed({ events, className = '' }: AgentActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-zinc-500 ${className}`}>
        <p className="text-sm">No agent activity yet</p>
        <p className="text-xs mt-1">Select a scenario to begin</p>
      </div>
    );
  }

  const clusters = buildClusters(events);

  return (
    <div ref={scrollRef} className={`overflow-y-auto space-y-1.5 ${className}`}>
      {clusters.map((cluster, i) =>
        cluster.kind === 'single' ? (
          <SingleEventRow key={cluster.event.id} event={cluster.event} index={i} />
        ) : (
          <div key={cluster.groupId} className="relative pl-3 ml-1 my-2 animate-in slide-in-from-left-2 duration-300">
            {/* Vertical bracket bar */}
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-cyan-500/60 rounded-full" />
            {/* Parallel header */}
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span>⚡</span>
              <span>PARALLEL x {cluster.events.length}</span>
              <span className="text-cyan-700 font-normal normal-case ml-1">Caputo et al. — concurrent dispatch</span>
            </div>
            {/* Parallel event rows */}
            <div className="space-y-1.5">
              {cluster.events.map((ev, j) => (
                <SingleEventRow key={ev.id} event={ev} index={i * 100 + j} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
