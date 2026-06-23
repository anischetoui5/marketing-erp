'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, DollarSign, CheckSquare, FileText } from 'lucide-react';
import { usePortalAuthStore } from '@/store/auth.store';
import { getPortalProject, getPortalProjectReports, reviewPortalTask, type PortalProjectDetail, type PortalReportSummary, type PortalTask } from '@/lib/portal-projects';
import { ReportStatusBadge } from '@/components/reports/report-status-badge';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: 'rgba(34,197,94,0.12)', text: '#15803d' },
  paused:    { bg: 'rgba(234,179,8,0.12)', text: '#a16207' },
  completed: { bg: 'rgba(78,90,191,0.12)', text: '#4E5ABF' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    '#64748b',
  medium: '#4E5ABF',
  high:   '#d97706',
  urgent: '#7E0B1C',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Brand Awareness', engagement: 'Engagement', traffic: 'Traffic',
  leads: 'Lead Generation', sales: 'Sales', conversions: 'Conversions',
};

// TABS are dynamic so we build them inside the component

export default function PortalProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = usePortalAuthStore((s) => s.user);
  const [project, setProject] = useState<PortalProjectDetail | null>(null);
  const [reports, setReports] = useState<PortalReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('deliverables');

  const [reviewModal, setReviewModal] = useState<{ task: PortalTask; decision: 'client_approved' | 'client_rejected' } | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/portal/login'); return; }
    getPortalProject(id)
      .then((p) => {
        if (!p) router.replace('/portal/dashboard/projects');
        else setProject(p);
      })
      .catch(() => router.replace('/portal/dashboard/projects'))
      .finally(() => setLoading(false));
  }, [user, router, id]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await getPortalProjectReports(id);
      setReports(data);
    } catch {
      // silent — no reports yet
    } finally {
      setReportsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'reports') loadReports();
  }, [activeTab, loadReports]);

  if (!user || loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleReview = async () => {
    if (!reviewModal || !project) return;
    if (reviewModal.decision === 'client_rejected' && !rejectionComment.trim()) return;
    setReviewing(true);
    try {
      await reviewPortalTask(project.id, reviewModal.task.id, reviewModal.decision, rejectionComment.trim() || undefined);
      setProject((p) => {
        if (!p) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === reviewModal.task.id
              ? { ...t, clientApproval: reviewModal.decision, clientRejectionComment: rejectionComment.trim() || null, clientReviewedAt: new Date().toISOString() }
              : t
          ),
        };
      });
      setReviewModal(null);
      setRejectionComment('');
    } catch {
      alert('Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  if (!project) return null;

  const sc = STATUS_COLORS[project.status] ?? { bg: 'rgba(28,14,66,0.08)', text: 'rgba(28,14,66,0.5)' };
  const doneTasks = project.tasks.filter((t) => t.status === 'done').length;
  const approvedTasks = project.tasks.filter((t) => t.status === 'approved').length;
  const pendingReview = project.tasks.filter((t) => t.clientApproval === 'pending').length;

  const TABS = [
    { key: 'deliverables', label: 'Deliverables' },
    ...(pendingReview > 0 ? [{ key: 'review', label: `Review (${pendingReview})` }] : []),
    { key: 'reports', label: 'Reports' },
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href="/portal/dashboard/projects"
        className="inline-flex items-center gap-2 text-xs"
        style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)', borderTop: '2px solid #1C0E42' }}>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <span
              className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ background: sc.bg, color: sc.text, fontFamily: "'DM Mono', monospace" }}
            >
              {project.status}
            </span>
          </div>
          <h1 className="text-xl font-black mb-1" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
            {project.name}
          </h1>
          <p className="text-xs mb-4" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
            {OBJECTIVE_LABELS[project.objective] ?? project.objective}
          </p>

          <div className="flex items-center gap-5 flex-wrap">
            {project.budgetTotal && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" style={{ color: '#4E5ABF' }} />
                <span className="text-xs" style={{ fontFamily: "'DM Mono', monospace", color: '#1C0E42' }}>
                  {project.budgetTotal.toLocaleString()} {project.budgetCurrency}
                </span>
              </div>
            )}
            {project.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" style={{ color: '#4E5ABF' }} />
                <span className="text-xs" style={{ fontFamily: "'DM Mono', monospace", color: '#1C0E42' }}>
                  {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {project.endDate ? ` → ${new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" style={{ color: '#4E5ABF' }} />
              <span className="text-xs" style={{ fontFamily: "'DM Mono', monospace", color: '#1C0E42' }}>
                {doneTasks} done · {approvedTasks} approved
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 border-t" style={{ borderColor: 'rgba(28,14,66,0.06)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3 text-[10px] uppercase tracking-widest font-semibold transition-colors"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: activeTab === tab.key ? '#1C0E42' : 'rgba(28,14,66,0.4)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #1C0E42' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deliverables tab */}
      {activeTab === 'deliverables' && (
        <div style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,14,66,0.06)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42', letterSpacing: '0.15em' }}>
              Deliverables
            </h3>
            <p className="text-[10px] mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
              Approved and completed tasks
            </p>
          </div>

          {project.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: 'rgba(28,14,66,0.25)' }}>
              <CheckSquare className="h-8 w-8 mb-2" />
              <p className="text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>No deliverables yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(28,14,66,0.06)' }}>
              {project.tasks.map((task) => (
                <div key={task.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', fontSize: '11px' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="text-[9px] font-bold uppercase px-2 py-0.5"
                        style={{ background: task.status === 'done' ? 'rgba(34,197,94,0.12)' : 'rgba(78,90,191,0.12)', color: task.status === 'done' ? '#15803d' : '#4E5ABF', fontFamily: "'DM Mono', monospace" }}
                      >
                        {task.status === 'done' ? 'Done' : 'Approved'}
                      </span>
                      <span
                        className="text-[9px] uppercase px-2 py-0.5"
                        style={{ background: 'rgba(28,14,66,0.05)', color: PRIORITY_COLORS[task.priority], fontFamily: "'DM Mono', monospace" }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="text-[9px] uppercase px-1.5 py-0.5"
                      style={{ background: task.department === 'marketing' ? 'rgba(61,31,95,0.1)' : 'rgba(78,90,191,0.1)', color: task.department === 'marketing' ? '#3D1F5F' : '#4E5ABF', fontFamily: "'DM Mono', monospace" }}
                    >
                      {task.department}
                    </span>
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" style={{ color: 'rgba(28,14,66,0.3)' }} />
                        <span className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {task.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        {task.assignees.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            title={a.fullName}
                            className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                            style={{ background: '#1C0E42' }}
                          >
                            {a.fullName.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review tab */}
      {activeTab === 'review' && (
        <div style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,14,66,0.06)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42', letterSpacing: '0.15em' }}>
              Pending Your Review
            </h3>
            <p className="text-[10px] mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
              Approve or reject tasks submitted by the agency
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(28,14,66,0.06)' }}>
            {project.tasks.filter((t) => t.clientApproval === 'pending').map((task) => (
              <div key={task.id} className="px-5 py-4">
                <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs mb-3 leading-relaxed" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', fontSize: '11px' }}>
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => { setReviewModal({ task, decision: 'client_approved' }); setRejectionComment(''); }}
                    style={{ height: 32, padding: '0 16px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600 }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setReviewModal({ task, decision: 'client_rejected' }); setRejectionComment(''); }}
                    style={{ height: 32, padding: '0 16px', background: '#7E0B1C', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600 }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,14,66,0.06)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42', letterSpacing: '0.15em' }}>
              Performance Reports
            </h3>
            <p className="text-[10px] mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
              AI-generated reports shared by your agency
            </p>
          </div>

          {reportsLoading ? (
            <div className="divide-y" style={{ borderColor: 'rgba(28,14,66,0.06)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: 'rgba(28,14,66,0.25)' }}>
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>No reports shared yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(28,14,66,0.06)' }}>
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/portal/dashboard/reports/${r.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
                      {r.periodStart} → {r.periodEnd}
                    </p>
                    <p className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
                      Shared {r.sharedAt ? new Date(r.sharedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <ReportStatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Review confirmation modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#1C0E42', marginBottom: 8 }}>
              {reviewModal.decision === 'client_approved' ? 'Approve Task' : 'Reject Task'}
            </h3>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(28,14,66,0.6)', marginBottom: 16 }}>
              "{reviewModal.task.title}"
            </p>

            {reviewModal.decision === 'client_rejected' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, color: 'rgba(28,14,66,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
                  Rejection Comment *
                </label>
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Explain what needs to be changed…"
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(28,14,66,0.15)', borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#1C0E42', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
                {!rejectionComment.trim() && (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#7E0B1C', marginTop: 4 }}>
                    A comment is required when rejecting
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setReviewModal(null); setRejectionComment(''); }}
                disabled={reviewing}
                style={{ height: 36, padding: '0 16px', background: 'none', border: '1px solid rgba(28,14,66,0.15)', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(28,14,66,0.6)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing || (reviewModal.decision === 'client_rejected' && !rejectionComment.trim())}
                style={{ height: 36, padding: '0 20px', background: reviewModal.decision === 'client_approved' ? '#15803d' : '#7E0B1C', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, opacity: reviewing || (reviewModal.decision === 'client_rejected' && !rejectionComment.trim()) ? 0.5 : 1 }}
              >
                {reviewing ? 'Submitting…' : reviewModal.decision === 'client_approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
