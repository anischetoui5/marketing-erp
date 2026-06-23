'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Calendar, ChevronRight, ChevronLeft, Send, Trash2, AlertCircle, CheckSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  getTasks, updateTaskStatus, getComments, addComment, deleteComment,
  type Task, type Comment,
} from '@/lib/tasks';
import { getProjects } from '@/lib/projects';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS: { key: string; label: string; accent: string }[] = [
  { key: 'todo',        label: 'Todo',        accent: '#94a3b8' },
  { key: 'in_progress', label: 'In Progress', accent: '#fbbf24' },
  { key: 'review',      label: 'Review',      accent: '#7B6CF0' },
  { key: 'revision',    label: 'Revision',    accent: '#fb7185' },
  { key: 'approved',    label: 'Approved',    accent: '#4ade80' },
  { key: 'done',        label: 'Done',        accent: '#4E5ABF' },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low:    { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8',  border: 'rgba(100,116,139,0.2)' },
  medium: { bg: 'rgba(78,90,191,0.15)',  text: '#7B6CF0',  border: 'rgba(78,90,191,0.3)' },
  high:   { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24',  border: 'rgba(251,191,36,0.25)' },
  urgent: { bg: 'rgba(251,113,133,0.12)',text: '#fb7185',  border: 'rgba(251,113,133,0.25)' },
};

// Matches backend ROLE_TRANSITIONS exactly (includes backwards)
const ROLE_TRANSITIONS: Record<string, Record<string, string[]>> = {
  admin: {
    todo: ['in_progress'],
    in_progress: ['review', 'todo'],
    review: ['approved', 'revision', 'in_progress'],
    revision: ['review', 'in_progress'],
    approved: ['done', 'review'],
    done: ['approved'],
  },
  marketing_manager: {
    todo: [], in_progress: [],
    review: ['approved', 'revision', 'in_progress'],
    revision: [],
    approved: ['done', 'review'],
    done: ['approved'],
  },
  production_manager: {
    todo: [], in_progress: [],
    review: ['approved', 'revision', 'in_progress'],
    revision: [],
    approved: ['done', 'review'],
    done: ['approved'],
  },
  marketing_agent: {
    todo: ['in_progress'],
    in_progress: ['review', 'todo'],
    review: ['in_progress'],
    revision: ['review', 'in_progress'],
    approved: [], done: [],
  },
  production_agent: {
    todo: ['in_progress'],
    in_progress: ['review', 'todo'],
    review: ['in_progress'],
    revision: ['review', 'in_progress'],
    approved: [], done: [],
  },
};

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const pc = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;
  const col = COLUMNS.find((c) => c.key === task.status);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${col?.accent ?? '#4E5ABF'}`,
        borderRadius: 10,
        padding: '14px 14px 12px',
        cursor: 'pointer',
      }}
    >
      {/* Priority badge top-right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, flex: 1, margin: 0, letterSpacing: '-0.01em' }}>
          {task.title}
        </p>
        <span style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 5, flexShrink: 0, fontWeight: 500, marginTop: 1 }}>
          {task.priority}
        </span>
      </div>

      {/* Department + due date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: task.assignees.length > 0 ? 10 : 0 }}>
        <span style={{ background: task.department === 'marketing' ? 'rgba(123,108,240,0.12)' : 'rgba(74,222,128,0.1)', color: task.department === 'marketing' ? '#7B6CF0' : '#4ade80', fontFamily: "'DM Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 4 }}>
          {task.department}
        </span>

        {task.dueDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={10} style={{ color: isOverdue ? '#fb7185' : 'var(--text-3)' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isOverdue ? '#fb7185' : 'var(--text-3)' }}>
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {task.commentsCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <MessageSquare size={10} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>{task.commentsCount}</span>
          </div>
        )}
      </div>

      {/* Assignee avatars */}
      {task.assignees.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 2, borderTop: '1px solid var(--border)' }}>
          {task.assignees.slice(0, 3).map((a) => (
            <div key={a.id} title={a.fullName}
              style={{ height: 22, width: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3D1F5F, #4E5ABF)', border: '2px solid var(--bg)', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 8 }}>
              {a.fullName.charAt(0).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', marginTop: 8 }}>+{task.assignees.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function TaskDrawer({ task, open, onClose, onStatusChange }: {
  task: Task | null; open: boolean; onClose: () => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !task) { setComments([]); setNewComment(''); setError(''); return; }
    setCommentsLoading(true);
    getComments(task.id, { limit: 50 })
      .then((res) => setComments(res.items))
      .catch(console.error)
      .finally(() => setCommentsLoading(false));
  }, [open, task]);

  useEffect(() => {
    if (comments.length > 0) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleStatusMove = async (toStatus: string) => {
    if (!task) return;
    setStatusUpdating(true);
    setError('');
    try {
      await updateTaskStatus(task.id, toStatus);
      onStatusChange(task.id, toStatus);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to update status'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePostComment = async () => {
    if (!task || !newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await addComment(task.id, newComment.trim());
      setComments((c) => [...c, comment]);
      setNewComment('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task || !confirm('Delete this comment?')) return;
    try {
      await deleteComment(task.id, commentId);
      setComments((c) => c.filter((x) => x.id !== commentId));
    } catch { alert('Failed to delete comment'); }
  };

  if (!task) return null;

  const role = user?.role ?? '';
  const nextStatuses = (ROLE_TRANSITIONS[role] ?? ROLE_TRANSITIONS.admin)[task.status] ?? [];
  const pc = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;
  const col = COLUMNS.find((c) => c.key === task.status);

  return (
    <Drawer open={open} onClose={onClose} title={task.title} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#fb7185' }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Status + badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${col?.accent}18`, border: `1px solid ${col?.accent}44`, color: col?.accent, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              <span style={{ height: 6, width: 6, borderRadius: '50%', background: col?.accent, display: 'inline-block' }} />
              {task.status.replace('_', ' ')}
            </span>
            <span style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              {task.priority}
            </span>
            <span style={{ background: task.department === 'marketing' ? 'rgba(123,108,240,0.12)' : 'rgba(74,222,128,0.1)', color: task.department === 'marketing' ? '#7B6CF0' : '#4ade80', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6 }}>
              {task.department}
            </span>
            {task.revisionCount > 0 && (
              <span style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', color: '#fb7185', fontFamily: "'DM Mono', monospace", fontSize: 9, padding: '4px 10px', borderRadius: 6 }}>
                {task.revisionCount} revision{task.revisionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Description</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{task.description}</p>
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {task.dueDate && (
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Due Date</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)' }}>
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
            {task.project && (
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Project</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.project.name}</p>
              </div>
            )}
          </div>

          {/* Assignees */}
          {task.assignees.length > 0 && (
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Assignees</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.assignees.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ height: 26, width: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3D1F5F, #4E5ABF)', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {a.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)' }}>{a.fullName}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>{a.role.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Move to */}
          {nextStatuses.length > 0 && (
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Move to</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {nextStatuses.map((s) => {
                  const targetCol = COLUMNS.find((c) => c.key === s);
                  const currentIdx = COLUMNS.findIndex((c) => c.key === task.status);
                  const targetIdx = COLUMNS.findIndex((c) => c.key === s);
                  const isBackward = targetIdx < currentIdx;
                  return (
                    <motion.button
                      key={s}
                      onClick={() => handleStatusMove(s)}
                      disabled={statusUpdating}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8, cursor: statusUpdating ? 'not-allowed' : 'pointer',
                        background: isBackward ? 'rgba(148,163,184,0.08)' : `${targetCol?.accent}18`,
                        border: `1px solid ${isBackward ? 'rgba(148,163,184,0.25)' : `${targetCol?.accent}44`}`,
                        color: isBackward ? 'var(--text-2)' : targetCol?.accent,
                        fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.07em', textTransform: 'uppercase',
                        opacity: statusUpdating ? 0.5 : 1,
                      }}
                    >
                      {isBackward ? <ChevronLeft size={11} /> : null}
                      {s.replace('_', ' ')}
                      {!isBackward ? <ChevronRight size={11} /> : null}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {nextStatuses.length === 0 && task.status !== 'done' && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
              Your role cannot move this task further.
            </p>
          )}

          {/* Comments */}
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
              Comments ({comments.length})
            </p>
            {commentsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : comments.length === 0 ? (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No comments yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ height: 26, width: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3D1F5F', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {c.author.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c.author.fullName}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>{c.body}</p>
                    </div>
                    {(user?.role === 'admin' || c.author.id === user?.id) && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        style={{ height: 20, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fb7185'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
              placeholder="Add a comment…"
              style={{ flex: 1, height: 36, padding: '0 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none' }}
            />
            <motion.button
              onClick={handlePostComment}
              disabled={!newComment.trim() || posting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: (!newComment.trim() || posting) ? 0.4 : 1 }}
            >
              <Send size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function TasksBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterProject, setFilterProject] = useState(searchParams.get('projectId') ?? '');
  const [filterDept, setFilterDept] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    getProjects({ status: 'active', limit: 50 })
      .then((res) => setProjects((res.items ?? res).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [user, router]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getTasks({ projectId: filterProject || undefined, department: filterDept || undefined, limit: 100 });
      setTasks(res.items);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user, filterProject, filterDept]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openTask = (task: Task) => { setSelectedTask(task); setDrawerOpen(true); };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: newStatus } : prev);
  };

  if (!user) return null;

  const colTasks = (status: string) => tasks.filter((t) => t.status === status);

  const selectStyle: React.CSSProperties = {
    height: 34, padding: '0 10px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 2 }}>Tasks</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
            {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={selectStyle}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={selectStyle}>
            <option value="">All depts</option>
            <option value="marketing">Marketing</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, flex: 1 }}>
        {COLUMNS.map((col) => {
          const colItems = colTasks(col.key);
          return (
            <div key={col.key} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: 232 }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', marginBottom: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${col.accent}`, borderRadius: '0 0 8px 8px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: col.accent }}>
                  {col.label}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, background: colItems.length > 0 ? `${col.accent}22` : 'var(--surface-2)', color: colItems.length > 0 ? col.accent : 'var(--text-3)', padding: '2px 8px', borderRadius: 10 }}>
                  {colItems.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)
                ) : colItems.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                    empty
                  </div>
                ) : (
                  <AnimatePresence>
                    {colItems.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10 }}>
          <CheckSquare size={32} style={{ color: 'var(--text-3)' }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>No tasks found for the selected filters.</p>
        </div>
      )}

      <TaskDrawer task={selectedTask} open={drawerOpen} onClose={() => setDrawerOpen(false)} onStatusChange={handleStatusChange} />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksBoard />
    </Suspense>
  );
}
