'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getReports, type Report } from '@/lib/reports';
import { ReportStatusBadge } from '@/components/reports/report-status-badge';
import { GenerateReportModal } from '@/components/reports/generate-report-modal';

export default function ReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const load = useCallback(async () => {
    try {
      const res = await getReports({ limit: 50 });
      setReports(res.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    load();
  }, [user, router, load]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Reports</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>AI-generated performance reports for clients</p>
        </div>
        {canManage && (
          <motion.button
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase' }}
          >
            <Plus size={13} /> Generate Report
          </motion.button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr', gap: 0, padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Project', 'Client', 'Period', 'Status', 'Shared'].map((h) => (
            <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ height: 9, flex: 2, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1.5, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
            </div>
          ))
        ) : reports.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
            <FileText size={28} style={{ color: 'var(--text-3)' }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No reports yet. Generate your first report.</p>
          </div>
        ) : (
          reports.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(`/dashboard/reports/${r.id}`)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr', alignItems: 'center', gap: 0, padding: '13px 20px', borderBottom: i < reports.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.project.name}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.clientName}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{r.periodStart} → {r.periodEnd}</span>
              <ReportStatusBadge status={r.status} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: r.sharedWithClient ? '#4ade80' : 'var(--text-3)' }}>{r.sharedWithClient ? 'Shared' : 'Internal'}</span>
            </motion.div>
          ))
        )}
      </div>

      {showModal && <GenerateReportModal onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  );
}
