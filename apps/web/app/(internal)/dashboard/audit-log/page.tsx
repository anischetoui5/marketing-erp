'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_type: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLogPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    api.get('/api/audit-log?limit=100')
      .then(({ data }) => setEntries(data.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Audit Log</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>All system actions</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Actor', 'Action', 'Entity', 'IP', 'When'].map((h) => (
            <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ height: 9, flex: 1.5, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 2, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
            <ScrollText size={28} style={{ color: 'var(--text-3)' }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No audit entries yet.</p>
          </div>
        ) : (
          entries.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', alignItems: 'center', padding: '11px 20px', borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {e.actor_email ?? e.actor_type}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#7B6CF0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {e.action}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-2)' }}>
                {e.entity_type ?? '—'}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>
                {e.ip_address ?? '—'}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>
                {timeAgo(e.created_at)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
