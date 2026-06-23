'use client';

import { motion } from 'framer-motion';

const CONFIG = {
  generating: { label: 'Generating', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', pulse: true },
  ready:      { label: 'Ready',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  pulse: false },
  failed:     { label: 'Failed',     color: '#fb7185', bg: 'rgba(251,113,133,0.1)', pulse: false },
};

export function ReportStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as keyof typeof CONFIG] ?? { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', pulse: false };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, border: `1px solid ${cfg.color}33`, padding: '3px 8px', borderRadius: 5 }}>
      {cfg.pulse ? (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ height: 6, width: 6, borderRadius: '50%', background: cfg.color }}
        />
      ) : (
        <div style={{ height: 6, width: 6, borderRadius: '50%', background: cfg.color }} />
      )}
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color, fontWeight: 600 }}>
        {cfg.label}
      </span>
    </span>
  );
}
