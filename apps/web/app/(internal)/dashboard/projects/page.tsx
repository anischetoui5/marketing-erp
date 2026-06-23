'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban, Plus, Calendar, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getProjects, type Project } from '@/lib/projects';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8',  label: 'Draft' },
  active:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e',  label: 'Active' },
  paused:    { bg: 'rgba(234,179,8,0.12)',   text: '#eab308',  label: 'Paused' },
  completed: { bg: 'rgba(78,90,191,0.12)',   text: '#7B6CF0',  label: 'Completed' },
  archived:  { bg: 'rgba(251,113,133,0.1)',  text: '#fb7185',  label: 'Archived' },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Brand Awareness', engagement: 'Engagement', traffic: 'Traffic',
  leads: 'Lead Generation', sales: 'Sales', conversions: 'Conversions',
};

export default function ProjectsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const canCreate = user?.role === 'admin' || user?.role === 'marketing_manager';

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getProjects({ status: status || undefined, page, limit })
      .then((res) => { setProjects(res.items); setTotal(res.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, status, page]);

  if (!user) return null;

  const btnBase: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600,
    letterSpacing: '0.08em', padding: '7px 14px', border: 'none',
    borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 2 }}>Projects</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
            {total} project{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 160 }}>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          {canCreate && (
            <Link
              href="/dashboard/projects/new"
              style={{ ...btnBase, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', color: '#fff', textDecoration: 'none' }}
            >
              <Plus size={13} />
              New Project
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10 }}>
          <FolderKanban size={32} style={{ color: 'var(--text-3)' }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No projects found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {projects.map((project) => {
            const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.draft;
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderTop: '2px solid var(--accent)', borderRadius: 10,
                  padding: 18, transition: 'box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ background: sc.bg, color: sc.text, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4 }}>
                    {sc.label}
                  </span>
                  {project.client && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, marginLeft: 8 }}>
                      {project.client.companyName}
                    </span>
                  )}
                </div>

                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  {project.name}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', margin: '0 0 14px' }}>
                  {OBJECTIVE_LABELS[project.objective] ?? project.objective}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {project.budgetTotal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={11} style={{ color: '#7B6CF0' }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
                        {project.budgetTotal.toLocaleString()} {project.budgetCurrency}
                      </span>
                    </div>
                  )}
                  {project.startDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} style={{ color: '#7B6CF0' }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
                        {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...btnBase, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            Prev
          </button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>
            {page} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            style={{ ...btnBase, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
