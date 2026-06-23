'use client';

import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string | number | null;
  suffix?: string;
  loading?: boolean;
  index?: number;
  color?: string;
}

export function KpiCard({ label, value, suffix, loading, index = 0, color = '#4E5ABF' }: KpiCardProps) {
  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
        <div className="skeleton" style={{ height: 9, width: '60%', borderRadius: 4, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: '40%', borderRadius: 4 }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 72, height: 72,
        borderRadius: '50%', background: `${color}22`, filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value === null || value === undefined ? '—' : `${value}${suffix ? suffix : ''}`}
      </p>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}80, transparent)` }} />
    </motion.div>
  );
}
