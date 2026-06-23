'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { CampaignRow } from '@/lib/analytics';

type SortKey = keyof CampaignRow;

function RoasBadge({ roas }: { roas: number | null }) {
  if (roas === null) return <span style={{ color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>—</span>;
  const color = roas >= 3 ? '#4ade80' : roas >= 1 ? '#fbbf24' : '#fb7185';
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color, fontWeight: 600 }}>
      {roas.toFixed(2)}x
    </span>
  );
}

function Cell({ val, suffix }: { val: number | null; suffix?: string }) {
  if (val === null) return <span style={{ color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>—</span>;
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{val.toLocaleString('en-US', { maximumFractionDigits: 2 })}{suffix}</span>;
}

interface CampaignTableProps { data: CampaignRow[]; loading?: boolean; }

export function CampaignTable({ data, loading }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 9, width: 60, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>
        No campaign data available
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey] as number | null ?? 0;
    const bVal = b[sortKey] as number | null ?? 0;
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const cols: { key: SortKey; label: string; sortable?: boolean }[] = [
    { key: 'campaignName', label: 'Campaign', sortable: false },
    { key: 'impressions', label: 'Impressions', sortable: true },
    { key: 'clicks', label: 'Clicks', sortable: true },
    { key: 'spend', label: 'Spend', sortable: true },
    { key: 'ctr', label: 'CTR', sortable: true },
    { key: 'cpc', label: 'CPC', sortable: true },
    { key: 'roas', label: 'ROAS', sortable: true },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  style={{
                    padding: '10px 14px', textAlign: 'left', fontFamily: "'DM Mono', monospace",
                    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--text-2)', cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.campaignId} style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.campaignName}
                </td>
                <td style={{ padding: '10px 14px' }}><Cell val={row.impressions} /></td>
                <td style={{ padding: '10px 14px' }}><Cell val={row.clicks} /></td>
                <td style={{ padding: '10px 14px' }}><Cell val={row.spend} suffix=" MAD" /></td>
                <td style={{ padding: '10px 14px' }}><Cell val={row.ctr} suffix="%" /></td>
                <td style={{ padding: '10px 14px' }}><Cell val={row.cpc} /></td>
                <td style={{ padding: '10px 14px' }}><RoasBadge roas={row.roas} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
