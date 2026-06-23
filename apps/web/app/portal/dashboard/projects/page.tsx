'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban, Calendar } from 'lucide-react';
import { usePortalAuthStore } from '@/store/auth.store';
import { getPortalProjects, type PortalProject } from '@/lib/portal-projects';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'rgba(34,197,94,0.12)', text: '#15803d',  label: 'Active' },
  paused:    { bg: 'rgba(234,179,8,0.12)', text: '#a16207',  label: 'Paused' },
  completed: { bg: 'rgba(78,90,191,0.12)', text: '#4E5ABF',  label: 'Completed' },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Brand Awareness', engagement: 'Engagement', traffic: 'Traffic',
  leads: 'Lead Generation', sales: 'Sales', conversions: 'Conversions',
};

export default function PortalProjectsPage() {
  const router = useRouter();
  const user = usePortalAuthStore((s) => s.user);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/portal/login'); return; }
    getPortalProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-lg font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
          Your Projects
        </h2>
        <p className="text-[11px] mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
          {user.fullName} · {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64" style={{ color: 'rgba(28,14,66,0.25)' }}>
          <FolderKanban className="h-10 w-10 mb-3" />
          <p className="text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>No active projects</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((project) => {
            const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.active;
            return (
              <Link
                key={project.id}
                href={`/portal/dashboard/projects/${project.id}`}
                className="block p-5 transition-shadow hover:shadow-md"
                style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)', borderTop: '2px solid #1C0E42' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ background: sc.bg, color: sc.text, fontFamily: "'DM Mono', monospace", letterSpacing: '0.15em' }}
                  >
                    {sc.label}
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
                  {project.name}
                </h3>
                <p className="text-[10px] mb-4" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.4)' }}>
                  {OBJECTIVE_LABELS[project.objective] ?? project.objective}
                </p>

                {project.startDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" style={{ color: '#4E5ABF' }} />
                    <span className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)' }}>
                      {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {project.endDate ? ` → ${new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
