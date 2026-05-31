import React from 'react';

interface StatusBadgeProps {
  connected: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ connected, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      connected
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        : 'bg-red-500/15 text-red-400 border border-red-500/30'
    }`}
  >
    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
    {label || (connected ? 'Connected' : 'Disconnected')}
  </span>
);
