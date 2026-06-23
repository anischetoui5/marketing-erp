'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar } from 'lucide-react';
import { usePortalAuthStore } from '@/store/auth.store';
import { getPortalReport, type Report } from '@/lib/reports';
import { ReportStatusBadge } from '@/components/reports/report-status-badge';
import { ReportContent } from '@/components/reports/report-content';

export default function PortalReportDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = usePortalAuthStore((s) => s.user);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/portal/login'); return; }
    getPortalReport(id)
      .then(setReport)
      .catch(() => router.replace('/portal/dashboard/projects'))
      .finally(() => setLoading(false));
  }, [user, id, router]);

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
      <Link
        href={`/portal/dashboard/projects/${report.project.id}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 20 }}
      >
        <ArrowLeft size={13} /> {report.project.name}
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <ReportStatusBadge status={report.status} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#4ade80' }}>Shared with you</span>
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
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
              {report.periodStart} → {report.periodEnd}
            </span>
          </div>
          {report.sharedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>
                Shared {new Date(report.sharedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Report content */}
      {report.status === 'ready' && <ReportContent report={report} showMeta={false} />}
      {report.status === 'generating' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px', textAlign: 'center' }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-2)' }}>Report is being prepared…</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
