'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Calendar, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getReport, shareReport, type Report } from '@/lib/reports';
import { ReportStatusBadge } from '@/components/reports/report-status-badge';
import { ReportContent } from '@/components/reports/report-content';

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    getReport(id)
      .then(setReport)
      .catch(() => router.replace('/dashboard/reports'))
      .finally(() => setLoading(false));
  }, [user, id, router]);

  const handleShare = async () => {
    if (!report) return;
    setSharing(true);
    try {
      const updated = await shareReport(id);
      setReport(updated);
    } catch {
      alert('Failed to share report');
    } finally {
      setSharing(false);
      setConfirmShare(false);
    }
  };

  if (loading || !report) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 16, width: 120, borderRadius: 4, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link href="/dashboard/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={13} /> Reports
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <ReportStatusBadge status={report.status} />
              {!report.sharedWithClient && canManage && report.status === 'ready' && (
                <motion.button
                  onClick={() => setConfirmShare(true)}
                  whileHover={{ scale: 1.03 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 5, color: '#4ade80', fontFamily: "'DM Mono', monospace", fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  <Share2 size={10} /> Share with Client
                </motion.button>
              )}
              {report.sharedWithClient && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#4ade80' }}>Shared with client</span>
              )}
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>
              {report.project.name}
            </h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', margin: 0 }}>{report.clientName}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={11} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{report.periodStart} → {report.periodEnd}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>By {report.createdBy}</span>
          </div>
          {report.costUsd && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <DollarSign size={11} style={{ color: 'var(--text-3)' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>AI cost: ${report.costUsd.toFixed(4)}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Report content */}
      {report.status === 'generating' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px', textAlign: 'center' }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-2)' }}>Claude is generating your report…</p>
          </motion.div>
        </div>
      )}

      {report.status === 'failed' && (
        <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#fb7185' }}>Report generation failed. Try generating a new report.</p>
        </div>
      )}

      {report.status === 'ready' && <ReportContent report={report} showMeta={true} />}

      {/* Confirm share dialog */}
      {confirmShare && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, padding: 28, width: 380, boxShadow: 'var(--card-shadow)' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Share with client?</h3>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 20 }}>
              This will notify all client users and grant them read access to this report. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmShare(false)} style={{ flex: 1, padding: '9px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleShare} disabled={sharing} style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #4ade80, #22d3ee)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                {sharing ? 'Sharing…' : 'Share Report'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
