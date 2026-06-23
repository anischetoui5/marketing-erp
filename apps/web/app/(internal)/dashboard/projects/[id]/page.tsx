'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, DollarSign, Users, Plus, Trash2, CheckSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getProject, updateProject, addTeamMembers, removeTeamMember, type ProjectDetail, type TeamMember } from '@/lib/projects';
import { getTasks, type Task } from '@/lib/tasks';
import { getAnalyticsSummary, getAnalyticsCampaigns, getAnalyticsDaily, getLatestInsight, type AnalyticsSummary, type CampaignRow, type DailyRow } from '@/lib/analytics';
import { KpiGrid } from '@/components/analytics/kpi-grid';
import { PerformanceChart } from '@/components/analytics/performance-chart';
import { CampaignTable } from '@/components/analytics/campaign-table';
import { SyncStatusBar } from '@/components/analytics/sync-status-bar';
import { InsightsPanel } from '@/components/insights/insights-panel';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { getBudgetSummary, getBudgetEntries, createBudgetEntry, deleteBudgetEntry, type BudgetSummary, type BudgetEntry } from '@/lib/budget';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  active:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  paused:    { bg: 'rgba(234,179,8,0.12)',   text: '#eab308' },
  completed: { bg: 'rgba(78,90,191,0.12)',   text: '#7B6CF0' },
  archived:  { bg: 'rgba(251,113,133,0.1)',  text: '#fb7185' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8', medium: '#7B6CF0', high: '#fbbf24', urgent: '#fb7185',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Todo', in_progress: 'In Progress', review: 'Review',
  revision: 'Revision', approved: 'Approved', done: 'Done',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Brand Awareness', engagement: 'Engagement', traffic: 'Traffic',
  leads: 'Lead Generation', sales: 'Sales', conversions: 'Conversions',
};

interface AvailableUser { id: string; fullName: string; role: string; }

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);

  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [analyticsCampaigns, setAnalyticsCampaigns] = useState<CampaignRow[]>([]);
  const [analyticsDaily, setAnalyticsDaily] = useState<DailyRow[]>([]);
  const [analyticsInsight, setAnalyticsInsight] = useState<{ summary: string | null; insights: { title: string; body: string }[] | null; recommendations: { title: string; body: string }[] | null; generatedAt: string } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ amount: '', category: 'ad_spend', description: '', entryDate: new Date().toISOString().split('T')[0] });
  const [budgetSaving, setBudgetSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const [proj, taskRes] = await Promise.all([getProject(id), getTasks({ projectId: id, limit: 50 })]);
      setProject(proj);
      setTasks(taskRes.items);
    } catch {
      router.replace('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    loadProject();
  }, [user, router, loadProject]);

  const loadAnalytics = useCallback(async () => {
    if (!id) return;
    setAnalyticsLoading(true);
    try {
      const [sum, camps, daily, insight] = await Promise.allSettled([
        getAnalyticsSummary(id), getAnalyticsCampaigns(id), getAnalyticsDaily(id), getLatestInsight(id),
      ]);
      if (sum.status === 'fulfilled') setAnalyticsSummary(sum.value);
      if (camps.status === 'fulfilled') setAnalyticsCampaigns(camps.value);
      if (daily.status === 'fulfilled') setAnalyticsDaily(daily.value);
      if (insight.status === 'fulfilled') setAnalyticsInsight(insight.value);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  const loadBudget = useCallback(async () => {
    if (!id) return;
    setBudgetLoading(true);
    try {
      const [summary, entries] = await Promise.all([getBudgetSummary(id), getBudgetEntries(id)]);
      setBudgetSummary(summary);
      setBudgetEntries(entries);
    } catch {
      // no-op
    } finally {
      setBudgetLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'team' && canManage) {
      api.get('/api/users?limit=100')
        .then(({ data }) => setAvailableUsers(
          (data.data?.items ?? []).map((u: { id: string; full_name?: string; fullName?: string; role: string }) => ({
            id: u.id, fullName: u.fullName ?? u.full_name ?? '', role: u.role,
          }))
        ))
        .catch(console.error);
    }
    if (activeTab === 'analytics') loadAnalytics();
    if (activeTab === 'budget') loadBudget();
  }, [activeTab, canManage, loadAnalytics, loadBudget]);

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    setStatusUpdating(true);
    try {
      await updateProject(id, { status: newStatus });
      setProject((p) => p ? { ...p, status: newStatus } : p);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to update status'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    setTeamLoading(true);
    try {
      const res = await addTeamMembers(id, [addUserId]);
      setProject((p) => p ? { ...p, team: res.team as TeamMember[] } : p);
      setAddUserId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to add member');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this team member?')) return;
    setTeamLoading(true);
    try {
      const res = await removeTeamMember(id, userId);
      setProject((p) => p ? { ...p, team: res.team as TeamMember[] } : p);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to remove member');
    } finally {
      setTeamLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) return null;

  const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.draft;
  const teamIds = project.team.map((m) => m.id);
  const nonTeamUsers = availableUsers.filter((u) => !teamIds.includes(u.id));

  const monoSm: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)' };
  const monoXs: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em' };
  const panelStyle: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' };

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back */}
      <Link href="/dashboard/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', ...monoSm, fontSize: 10 }}>
        <ArrowLeft size={13} />
        Projects
      </Link>

      {/* Hero card */}
      <div style={{ ...panelStyle, borderTop: '2px solid var(--accent)' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ background: sc.bg, color: sc.text, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 4 }}>
                  {project.status}
                </span>
                {project.client && (
                  <span style={{ ...monoXs, textTransform: 'none', letterSpacing: 0 }}>{project.client.companyName}</span>
                )}
              </div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, marginBottom: 4 }}>
                {project.name}
              </h1>
              <p style={{ ...monoSm, fontSize: 10, margin: 0 }}>
                {OBJECTIVE_LABELS[project.objective] ?? project.objective}
              </p>
            </div>

            {canManage && (
              <div style={{ flexShrink: 0 }}>
                <select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ height: 32, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 10, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                {statusUpdating && <p style={{ ...monoXs, marginTop: 4, textAlign: 'center', letterSpacing: 0 }}>Saving…</p>}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 4 }}>
            {project.budgetTotal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <DollarSign size={12} style={{ color: '#7B6CF0' }} />
                <span style={monoSm}>{project.budgetTotal.toLocaleString()} {project.budgetCurrency}</span>
              </div>
            )}
            {project.startDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} style={{ color: '#7B6CF0' }} />
                <span style={monoSm}>
                  {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {project.endDate ? ` → ${new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={12} style={{ color: '#7B6CF0' }} />
              <span style={monoSm}>{project.team.length} member{project.team.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckSquare size={12} style={{ color: '#7B6CF0' }} />
              <span style={monoSm}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 8px' }}>
          <Tabs
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'tasks', label: 'Tasks', count: tasks.length },
              { key: 'team', label: 'Team', count: project.team.length },
              { key: 'analytics', label: 'Analytics' },
              { key: 'budget', label: 'Budget' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ ...panelStyle, padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={monoXs}>Created</p>
              <p style={{ ...monoSm, marginTop: 6 }}>
                {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {project.metaAdsAccountId && (
              <div>
                <p style={monoXs}>Meta Ads ID</p>
                <p style={{ ...monoSm, marginTop: 6 }}>{project.metaAdsAccountId}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Tasks</p>
            {canManage && (
              <Link href={`/dashboard/tasks?projectId=${project.id}`} style={{ ...monoSm, color: '#7B6CF0', textDecoration: 'none', fontSize: 10 }}>
                View kanban →
              </Link>
            )}
          </div>
          {tasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
              <CheckSquare size={28} style={{ color: 'var(--text-3)' }} />
              <p style={{ ...monoSm, fontSize: 11, color: 'var(--text-3)' }}>No tasks yet</p>
            </div>
          ) : (
            tasks.map((task, i) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ ...monoXs, marginTop: 3, textTransform: 'none', letterSpacing: 0 }}>{task.department}</p>
                </div>
                <span style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontFamily: "'DM Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4 }}>
                  {TASK_STATUS_LABELS[task.status] ?? task.status}
                </span>
                <span style={{ color: PRIORITY_COLORS[task.priority], fontFamily: "'DM Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 4, background: `${PRIORITY_COLORS[task.priority]}18` }}>
                  {task.priority}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div style={panelStyle}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Team Members</p>
          </div>

          {canManage && nonTeamUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                style={{ flex: 1, height: 34, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none' }}
              >
                <option value="">Select user to add…</option>
                {nonTeamUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addUserId || teamLoading}
                style={{ height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, opacity: (!addUserId || teamLoading) ? 0.5 : 1 }}
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          )}

          {project.team.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8 }}>
              <Users size={24} style={{ color: 'var(--text-3)' }} />
              <p style={{ ...monoSm, color: 'var(--text-3)', fontSize: 11 }}>No team members yet</p>
            </div>
          ) : (
            project.team.map((member, i) => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < project.team.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ height: 32, width: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3D1F5F, #4E5ABF)', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{member.fullName}</p>
                  <p style={{ ...monoXs, marginTop: 3, textTransform: 'none', letterSpacing: 0 }}>
                    {member.role.replace(/_/g, ' ')}{member.department ? ` · ${member.department}` : ''}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={teamLoading}
                    style={{ height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 6, opacity: teamLoading ? 0.4 : 1 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fb7185'; (e.currentTarget as HTMLElement).style.background = 'rgba(251,113,133,0.08)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SyncStatusBar projectId={id} canSync={canManage} />
          <KpiGrid summary={analyticsSummary} loading={analyticsLoading} />
          <PerformanceChart data={analyticsDaily} loading={analyticsLoading} />
          <CampaignTable data={analyticsCampaigns} loading={analyticsLoading} />
          <InsightsPanel insight={analyticsInsight} loading={analyticsLoading} />
        </div>
      )}

      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary card */}
          <div style={{ ...panelStyle, padding: 20 }}>
            {budgetLoading ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={monoXs}>Loading…</span>
              </div>
            ) : budgetSummary ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                  {[
                    { label: 'Budget', value: budgetSummary.budgetTotal != null ? `${budgetSummary.budgetTotal.toLocaleString()} ${budgetSummary.currency ?? ''}` : '—' },
                    { label: 'Spent', value: `${budgetSummary.totalSpent.toLocaleString()} ${budgetSummary.currency ?? ''}` },
                    { label: 'Remaining', value: budgetSummary.remaining != null ? `${budgetSummary.remaining.toLocaleString()} ${budgetSummary.currency ?? ''}` : '—' },
                    { label: 'Used', value: budgetSummary.percentUsed != null ? `${budgetSummary.percentUsed}%` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={monoXs}>{label}</p>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{value}</p>
                    </div>
                  ))}
                </div>
                {budgetSummary.budgetTotal != null && budgetSummary.percentUsed != null && (
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: budgetSummary.percentUsed > 90 ? '#ef4444' : budgetSummary.percentUsed > 70 ? '#f59e0b' : '#22c55e', width: `${Math.min(100, budgetSummary.percentUsed)}%`, transition: 'width 0.5s ease' }} />
                  </div>
                )}
                {Object.keys(budgetSummary.byCategory).length > 0 && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                    {Object.entries(budgetSummary.byCategory).map(([cat, amt]) => (
                      <div key={cat} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ ...monoXs, textTransform: 'none', letterSpacing: 0 }}>{cat.replace('_', ' ')}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)', fontWeight: 600 }}>{amt.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ ...monoXs, textAlign: 'center', letterSpacing: 0 }}>No budget data</p>
            )}
          </div>

          {/* Add entry form */}
          {canManage && (
            <div style={{ ...panelStyle, padding: 20 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Add Entry</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Amount</p>
                  <input
                    type="number" min="0" step="0.01"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    style={{ width: '100%', height: 34, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Category</p>
                  <select
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', height: 34, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none' }}
                  >
                    <option value="ad_spend">Ad Spend</option>
                    <option value="production">Production</option>
                    <option value="design">Design</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Date</p>
                  <input
                    type="date"
                    value={budgetForm.entryDate}
                    onChange={(e) => setBudgetForm((f) => ({ ...f, entryDate: e.target.value }))}
                    style={{ width: '100%', height: 34, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  disabled={!budgetForm.amount || budgetSaving}
                  onClick={async () => {
                    if (!budgetForm.amount) return;
                    setBudgetSaving(true);
                    try {
                      await createBudgetEntry(id, {
                        amount: parseFloat(budgetForm.amount),
                        category: budgetForm.category,
                        description: budgetForm.description || undefined,
                        entryDate: budgetForm.entryDate,
                      });
                      setBudgetForm((f) => ({ ...f, amount: '', description: '' }));
                      await loadBudget();
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                      alert(msg ?? 'Failed to add entry');
                    } finally {
                      setBudgetSaving(false);
                    }
                  }}
                  style={{ height: 34, padding: '0 16px', background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: !budgetForm.amount || budgetSaving ? 0.5 : 1, whiteSpace: 'nowrap' }}
                >
                  <Plus size={12} />
                  {budgetSaving ? 'Saving…' : 'Add'}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <p style={{ ...monoXs, marginBottom: 6 }}>Description (optional)</p>
                <input
                  type="text"
                  value={budgetForm.description}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Note…"
                  style={{ width: '100%', height: 34, padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Entries list */}
          <div style={panelStyle}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Entries ({budgetEntries.length})
              </p>
            </div>
            {budgetEntries.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                <p style={{ ...monoXs, letterSpacing: 0 }}>No entries yet</p>
              </div>
            ) : (
              budgetEntries.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < budgetEntries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {entry.amount.toLocaleString()} {budgetSummary?.currency ?? ''}
                      </span>
                      <span style={{ ...monoXs, textTransform: 'none', letterSpacing: 0, background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 4 }}>
                        {entry.category.replace('_', ' ')}
                      </span>
                    </div>
                    {entry.description && (
                      <p style={{ ...monoXs, marginTop: 3, textTransform: 'none', letterSpacing: 0 }}>{entry.description}</p>
                    )}
                    <p style={{ ...monoXs, marginTop: 2 }}>
                      {entry.entryDate} · {entry.createdBy?.fullName ?? 'Unknown'}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this entry?')) return;
                        try {
                          await deleteBudgetEntry(id, entry.id);
                          await loadBudget();
                        } catch {}
                      }}
                      style={{ height: 28, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 6 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fb7185'; (e.currentTarget as HTMLElement).style.background = 'rgba(251,113,133,0.08)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
