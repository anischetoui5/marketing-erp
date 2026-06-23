'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyRow } from '@/lib/analytics';

type Metric = 'spend' | 'clicks' | 'impressions' | 'ctr';

const METRIC_CONFIG: Record<Metric, { label: string; color: string; format: (v: number) => string }> = {
  spend:       { label: 'Spend (MAD)', color: '#7B6CF0', format: (v) => v.toFixed(2) },
  clicks:      { label: 'Clicks',      color: '#4E5ABF', format: (v) => v.toLocaleString() },
  impressions: { label: 'Impressions', color: '#4ade80', format: (v) => v.toLocaleString() },
  ctr:         { label: 'CTR (%)',     color: '#fbbf24', format: (v) => `${v.toFixed(2)}%` },
};

interface PerformanceChartProps { data: DailyRow[]; loading?: boolean; }

export function PerformanceChart({ data, loading }: PerformanceChartProps) {
  const [metric, setMetric] = useState<Metric>('spend');
  const cfg = METRIC_CONFIG[metric];

  if (loading) {
    return <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />;
  }

  if (!data.length) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>
        No data for selected period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    value: metric === 'ctr' ? (d.ctr ?? 0) : d[metric],
  }));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
              background: metric === m ? METRIC_CONFIG[m].color : 'var(--surface-2)',
              color: metric === m ? '#fff' : 'var(--text-2)',
              border: `1px solid ${metric === m ? METRIC_CONFIG[m].color : 'var(--border)'}`,
            }}
          >
            {METRIC_CONFIG[m].label.split(' ')[0]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: 'var(--text-3)' }} />
          <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: 'var(--text-3)' }} tickFormatter={cfg.format} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)' }}
            formatter={(v) => [cfg.format(typeof v === 'number' ? v : 0), cfg.label]}
          />
          <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
