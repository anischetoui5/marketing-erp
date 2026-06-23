'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getClients, type Client } from '@/lib/clients';

export default function ClientsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    getClients({ limit: 50 })
      .then((res) => setClients(res.items ?? res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Clients</h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>All agency clients</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Company', 'Contact', 'Industry', 'Email'].map((h) => (
            <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ height: 9, flex: 2, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1.5, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
            </div>
          ))
        ) : clients.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
            <Building2 size={28} style={{ color: 'var(--text-3)' }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No clients yet.</p>
          </div>
        ) : (
          clients.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr', alignItems: 'center', padding: '13px 20px', borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{c.companyName}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{c.contactName ?? '—'}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{c.industry ?? '—'}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contactEmail ?? '—'}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
