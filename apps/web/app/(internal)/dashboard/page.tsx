'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban, CheckSquare, Users, TrendingUp,
  ArrowUpRight, Clock, Zap, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { getProjects } from '@/lib/projects';
import { getTasks } from '@/lib/tasks';
import { api } from '@/lib/api';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface OverviewPoint { date: string; impressions: number; clicks: number; spend: number; }
interface StatData {
  label: string; value: number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string; glow: string; delta?: string;
}
interface ProjectItem { id: string; name: string; status: string; clientName: string; budget: number; currency: string; }
interface TaskItem    { id: string; title: string; status: string; priority: string; projectName: string; }

/* ── Count-up hook ────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1000, delay = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const timeout = setTimeout(() => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, delay]);
  return val;
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ item, index }: { item: StatData; index: number }) {
  const count = useCountUp(item.value, 900, index * 110);
  const Icon  = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -3 }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -24, right: -24, width: 96, height: 96, borderRadius: '50%', background: item.glow, filter: 'blur(28px)', opacity: 0.45, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ height: 36, width: 36, borderRadius: 10, background: `${item.color}1a`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: item.color }} />
        </div>
        {item.delta && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '2px 7px', borderRadius: 5 }}>
            {item.delta}
          </span>
        )}
      </div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>{count}</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.label}</p>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: index * 0.08 + 0.28, duration: 0.45 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${item.color}90, transparent)`, transformOrigin: 'left' }} />
    </motion.div>
  );
}

/* ── Status badge ─────────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80', label: 'Active'      },
  draft:       { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: 'Draft'       },
  completed:   { bg: 'rgba(78,90,191,0.15)',  color: '#7B6CF0', label: 'Completed'   },
  on_hold:     { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', label: 'On Hold'     },
  todo:        { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: 'Todo'        },
  in_progress: { bg: 'rgba(78,90,191,0.15)',  color: '#7B6CF0', label: 'In Progress' },
  review:      { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', label: 'Review'      },
  revision:    { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', label: 'Revision'    },
  approved:    { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80', label: 'Approved'    },
  done:        { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80', label: 'Done'        },
};
function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: status };
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: s.bg, color: s.color, border: `1px solid ${s.color}33`, padding: '2px 8px', borderRadius: 5 }}>
      {s.label}
    </span>
  );
}
const PRIORITY_DOT: Record<string, string> = { urgent: '#fb7185', high: '#f97316', medium: '#fbbf24', low: '#94a3b8' };

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user   = useAuthStore((s) => s.user);
  useThemeStore((s) => s.theme); // subscribe so header re-renders on toggle

  const [projects,  setProjects]  = useState<ProjectItem[]>([]);
  const [tasks,     setTasks]     = useState<TaskItem[]>([]);
  const [counts,    setCounts]    = useState({ clients: 0, projects: 0, tasks: 0, inReview: 0 });
  const [loading,   setLoading]   = useState(true);
  const [overview,  setOverview]  = useState<OverviewPoint[]>([]);
  const [chartMetric, setChartMetric] = useState<'spend' | 'impressions' | 'clicks'>('spend');

  useEffect(() => {
    async function load() {
      try {
        const [projRes, taskRes, clientRes, allTaskRes, overviewRes] = await Promise.all([
          getProjects({ status: 'active', limit: 5 }),
          getTasks({ limit: 6 }),
          api.get('/api/clients?limit=200'),
          getTasks({ limit: 200 }),
          api.get('/api/analytics/overview').catch(() => ({ data: { data: [] } })),
        ]);
        const projList  = ((projRes.items ?? projRes) as unknown) as Record<string, unknown>[];
        const taskList  = ((taskRes.items ?? taskRes) as unknown) as Record<string, unknown>[];
        const allTasks  = ((allTaskRes.items ?? allTaskRes) as unknown) as Record<string, unknown>[];
        setProjects(projList.slice(0, 5).map((p) => ({
          id:         String(p.id),
          name:       String(p.name),
          status:     String(p.status),
          clientName: String((p.client as Record<string,unknown>)?.companyName ?? (p.client as Record<string,unknown>)?.company_name ?? '—'),
          budget:     Number(p.budgetTotal ?? p.budget_total ?? 0),
          currency:   String(p.budgetCurrency ?? p.budget_currency ?? 'MAD'),
        })));
        setTasks(taskList.slice(0, 6).map((t) => ({
          id:          String(t.id),
          title:       String(t.title),
          status:      String(t.status),
          priority:    String(t.priority),
          projectName: String((t.project as Record<string,unknown>)?.name ?? '—'),
        })));
        setCounts({
          clients:  clientRes.data?.total ?? clientRes.data?.items?.length ?? 0,
          projects: projRes.total ?? projList.length,
          tasks:    allTasks.length,
          inReview: allTasks.filter((t) => t.status === 'review').length,
        });
        setOverview((overviewRes.data?.data ?? []).map((p: OverviewPoint) => ({
          ...p,
          date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats: StatData[] = [
    { label: 'Active Projects', value: counts.projects, icon: FolderKanban, color: '#7B6CF0', glow: 'rgba(123,108,240,0.3)', delta: '+2 this month' },
    { label: 'Open Tasks',      value: counts.tasks,    icon: CheckSquare,  color: '#4E5ABF', glow: 'rgba(78,90,191,0.3)',  delta: '+5 this week'  },
    { label: 'Clients',         value: counts.clients,  icon: Users,        color: '#4ade80', glow: 'rgba(74,222,128,0.25)'                         },
    { label: 'In Review',       value: counts.inReview, icon: TrendingUp,   color: '#fbbf24', glow: 'rgba(251,191,36,0.25)'                          },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }} style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <motion.span animate={{ rotate: [0, 12, -6, 0] }} transition={{ delay: 0.5, duration: 0.5 }} style={{ fontSize: 20 }}>👋</motion.span>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', margin: 0 }}>
            {greeting}, {user?.fullName?.split(' ')[0] ?? 'there'}
          </h2>
        </div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.04em', margin: 0 }}>
          Here&rsquo;s what&rsquo;s happening across your workspace today.
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => <StatCard key={s.label} item={s} index={i} />)}
      </div>

      {/* Analytics overview chart */}
      {overview.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.38 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BarChart2 size={13} style={{ color: '#7B6CF0' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Campaign Performance · Last 30 Days</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['spend', 'impressions', 'clicks'] as const).map((m) => (
                <button key={m} onClick={() => setChartMetric(m)}
                  style={{ height: 24, padding: '0 10px', borderRadius: 5, border: '1px solid', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.15s',
                    borderColor: chartMetric === m ? '#7B6CF0' : 'var(--border)',
                    background: chartMetric === m ? 'rgba(123,108,240,0.12)' : 'transparent',
                    color: chartMetric === m ? '#7B6CF0' : 'var(--text-3)' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 8px 8px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={overview} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7B6CF0" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7B6CF0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} width={48}
                  tickFormatter={(v: number) => chartMetric === 'spend' ? `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10 }}
                  labelStyle={{ color: 'var(--text-2)', marginBottom: 4 }}
                  itemStyle={{ color: '#7B6CF0' }}
                  formatter={(v) => [chartMetric === 'spend' ? `$${Number(v).toFixed(2)}` : Number(v).toLocaleString(), chartMetric]}
                />
                <Area type="monotone" dataKey={chartMetric} stroke="#7B6CF0" strokeWidth={2} fill="url(#chartGrad)" dot={false} activeDot={{ r: 4, fill: '#7B6CF0' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Projects panel */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.38 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <FolderKanban size={13} style={{ color: '#7B6CF0' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Projects</span>
            </div>
            <motion.a href="/dashboard/projects" whileHover={{ x: 2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#7B6CF0', textDecoration: 'none' }}>
              View all <ArrowUpRight size={10} />
            </motion.a>
          </div>
          <div>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 18px', display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ height: 9, width: '45%', borderRadius: 3 }} />
                <div className="skeleton" style={{ height: 9, width: '20%', borderRadius: 3 }} />
              </div>
            )) : projects.length === 0 ? (
              <div style={{ padding: '22px 18px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>No active projects</div>
            ) : projects.map((p, i) => (
              <motion.a key={p.id} href={`/dashboard/projects/${p.id}`}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 + i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', textDecoration: 'none', borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>{p.clientName}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{p.budget.toLocaleString()} {p.currency}</span>
                  <Badge status={p.status} />
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Tasks panel */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.41, duration: 0.38 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CheckSquare size={13} style={{ color: '#4E5ABF' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Tasks</span>
            </div>
            <motion.a href="/dashboard/tasks" whileHover={{ x: 2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#4E5ABF', textDecoration: 'none' }}>
              Board view <ArrowUpRight size={10} />
            </motion.a>
          </div>
          <div>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="skeleton" style={{ height: 8, width: 8, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 3 }} />
              </div>
            )) : tasks.length === 0 ? (
              <div style={{ padding: '22px 18px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>No tasks yet</div>
            ) : tasks.map((t, i) => (
              <motion.a key={t.id} href={`/dashboard/tasks?taskId=${t.id}`}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 + i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', textDecoration: 'none', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div style={{ height: 7, width: 7, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? '#94a3b8', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{t.title}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>{t.projectName}</p>
                </div>
                <Badge status={t.status} />
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.38 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <Zap size={13} style={{ color: '#fbbf24' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {[
              { label: 'New Project', href: '/dashboard/projects/new', color: '#7B6CF0' },
              { label: 'Open Tasks',  href: '/dashboard/tasks',        color: '#4E5ABF' },
              { label: 'Clients',     href: '/dashboard/clients',      color: '#4ade80' },
              { label: 'Reports',     href: '/dashboard/reports',      color: '#fbbf24' },
            ].map((a, i) => (
              <motion.a key={a.href} href={a.href}
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.52 + i * 0.05 }}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px 8px', borderRadius: 9,
                  textDecoration: 'none', background: `${a.color}12`, border: `1px solid ${a.color}28`,
                  fontFamily: "'DM Mono', monospace", fontSize: 10, color: a.color, fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {a.label}
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54, duration: 0.38 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <Clock size={13} style={{ color: '#fb7185' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Activity</span>
          </div>
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: 'var(--border)' }} />
            {[
              { text: 'Ramadan key visual moved to in_progress', time: '2h ago', color: '#7B6CF0' },
              { text: 'New comment on "Social media copy"',       time: '4h ago', color: '#4E5ABF' },
              { text: 'Meta Ads setup sent for revision',         time: '6h ago', color: '#fbbf24' },
              { text: 'Media plan Q3 2025 approved',              time: '1d ago', color: '#4ade80' },
              { text: 'Kick-off deck marked as done',             time: '2d ago', color: '#94a3b8' },
            ].map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.58 + i * 0.06 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 4 ? 13 : 0, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -14, top: 5, height: 8, width: 8, borderRadius: '50%', background: ev.color, boxShadow: `0 0 6px ${ev.color}80` }} />
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)', lineHeight: 1.45, margin: 0 }}>{ev.text}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', marginTop: 2, marginBottom: 0 }}>{ev.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
