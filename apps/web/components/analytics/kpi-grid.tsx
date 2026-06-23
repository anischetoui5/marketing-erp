'use client';

import { KpiCard } from './kpi-card';
import type { AnalyticsSummary } from '@/lib/analytics';

interface KpiGridProps { summary: AnalyticsSummary | null; loading: boolean; }

function fmt(n: number | null, decimals = 2): string | null {
  if (n === null || n === undefined) return null;
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function KpiGrid({ summary, loading }: KpiGridProps) {
  const cards = [
    { label: 'Total Spend',       value: summary ? fmt(summary.totalSpend) : null,       suffix: ' MAD', color: '#7B6CF0' },
    { label: 'Total Impressions', value: summary ? fmt(summary.totalImpressions, 0) : null, color: '#4E5ABF' },
    { label: 'Total Clicks',      value: summary ? fmt(summary.totalClicks, 0) : null,   color: '#4ade80' },
    { label: 'Avg CTR',           value: summary ? fmt(summary.avgCtr) : null,            suffix: '%',     color: '#fbbf24' },
    { label: 'Avg ROAS',          value: summary ? fmt(summary.avgRoas) : null,           suffix: 'x',     color: '#fb7185' },
    { label: 'Total Conversions', value: summary ? fmt(summary.totalConversions, 0) : null, color: '#34d399' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {cards.map((c, i) => (
        <KpiCard key={c.label} label={c.label} value={loading ? null : c.value} suffix={c.suffix} loading={loading} index={i} color={c.color} />
      ))}
    </div>
  );
}
