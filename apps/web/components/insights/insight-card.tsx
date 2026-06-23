'use client';

import { motion } from 'framer-motion';

interface InsightCardProps {
  title: string;
  body: string;
  color?: string;
  index?: number;
}

export function InsightCard({ title, body, color = '#4E5ABF', index = 0 }: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '10px 0 0 10px' }} />
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6, paddingLeft: 2 }}>
        {title}
      </p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6, paddingLeft: 2 }}>
        {body}
      </p>
    </motion.div>
  );
}
