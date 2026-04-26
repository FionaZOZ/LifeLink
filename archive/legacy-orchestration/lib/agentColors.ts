// Shared agent color scheme and icons for use across components.
// This ensures consistent visual identity for each Fetch.ai agent type.

export const AGENT_COLORS: Record<string, string> = {
  Coordinator: 'text-blue-400',
  AED: 'text-yellow-400',
  EMS: 'text-red-400',
  Drone: 'text-cyan-400',
  Triage: 'text-purple-400',
  Handoff: 'text-green-400',
  Voice: 'text-pink-400',
  Optimizer: 'text-orange-400',
};

export const AGENT_ICONS: Record<string, string> = {
  Coordinator: '🧠',
  AED: '⚡',
  EMS: '🚑',
  Drone: '🛸',
  Triage: '🏥',
  Handoff: '📋',
  Voice: '🎙️',
  Optimizer: '📊',
};
