'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Send } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:              { bg: 'rgba(126,11,28,0.12)',   text: '#7E0B1C' },
  marketing_manager:  { bg: 'rgba(78,90,191,0.12)',   text: '#4E5ABF' },
  marketing_agent:    { bg: 'rgba(123,108,240,0.12)', text: '#7B6CF0' },
  production_manager: { bg: 'rgba(251,191,36,0.12)',  text: '#b45309' },
  production_agent:   { bg: 'rgba(74,222,128,0.12)',  text: '#15803d' },
};

// Which roles each actor can create
const CREATABLE_ROLES: Record<string, { value: string; label: string }[]> = {
  admin: [
    { value: 'admin',              label: 'Admin' },
    { value: 'marketing_manager',  label: 'Marketing Manager' },
    { value: 'marketing_agent',    label: 'Marketing Agent' },
    { value: 'production_manager', label: 'Production Manager' },
    { value: 'production_agent',   label: 'Production Agent' },
  ],
  marketing_manager:  [{ value: 'marketing_agent',  label: 'Marketing Agent' }],
  production_manager: [{ value: 'production_agent', label: 'Production Agent' }],
};

const DEPARTMENT_OPTIONS = [
  { value: 'marketing',   label: 'Marketing' },
  { value: 'production',  label: 'Production' },
  { value: 'management',  label: 'Management' },
  { value: 'finance',     label: 'Finance' },
  { value: 'hr',          label: 'HR' },
];

export default function UsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const creatableRoles = user ? (CREATABLE_ROLES[user.role] ?? []) : [];
  const isManager = user?.role === 'marketing_manager' || user?.role === 'production_manager';

  const defaultRole = creatableRoles[0]?.value ?? '';
  const [form, setForm] = useState({ email: '', fullName: '', role: defaultRole, department: '' });

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users?limit=100');
      setUsers(data.data?.items ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!['admin', 'marketing_manager', 'production_manager'].includes(user.role)) {
      router.replace('/dashboard');
      return;
    }
    loadUsers();
  }, [user, router, loadUsers]);

  // Keep role in sync if form was initialized before creatableRoles resolved
  useEffect(() => {
    if (creatableRoles.length === 1) {
      setForm((f) => ({ ...f, role: creatableRoles[0].value }));
    }
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/api/users', {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        department: form.department || undefined,
      });
      setSuccess(`Invitation sent to ${form.email}`);
      setForm({ email: '', fullName: '', role: defaultRole, department: '' });
      setShowForm(false);
      await loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  const monoXs: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em' };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>
            {isManager ? 'My Agents' : 'Users'}
          </h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
            {isManager ? `${user?.role === 'marketing_manager' ? 'Marketing' : 'Production'} agents on your team` : 'Internal team members'}
          </p>
        </div>

        {creatableRoles.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm((v) => !v); setError(''); setSuccess(''); }}
            style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600 }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Invite Agent'}
          </motion.button>
        )}
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Send size={12} />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}
          >
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              Invite new {isManager ? (user?.role === 'marketing_manager' ? 'marketing agent' : 'production agent') : 'user'}
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Full Name</p>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Adem Bouzid"
                    style={{ width: '100%', height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Email</p>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="adem@agency.com"
                    style={{ width: '100%', height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Role</p>
                  {creatableRoles.length === 1 ? (
                    <div style={{ height: 36, padding: '0 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)' }}>
                      {creatableRoles[0].label}
                    </div>
                  ) : (
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      style={{ width: '100%', height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none' }}
                    >
                      {creatableRoles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <p style={{ ...monoXs, marginBottom: 6 }}>Department (optional)</p>
                  <select
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    style={{ width: '100%', height: 36, padding: '0 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none' }}
                  >
                    <option value="">— None —</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#ef4444', marginBottom: 12 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ height: 36, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
                >
                  <Send size={12} />
                  {saving ? 'Sending…' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ height: 36, padding: '0 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Name', 'Email', 'Role', 'Department', 'Active'].map((h) => (
            <span key={h} style={{ ...monoXs }}>{h}</span>
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
        ) : users.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
            <Users size={28} style={{ color: 'var(--text-3)' }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>
              {isManager ? 'No agents yet — invite one above.' : 'No users found.'}
            </p>
          </div>
        ) : (
          users.map((u, i) => {
            const rc = ROLE_COLORS[u.role] ?? { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' };
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', alignItems: 'center', padding: '12px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{u.full_name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{u.email}</span>
                <span style={{ display: 'inline-flex', width: 'fit-content', padding: '2px 8px', borderRadius: 4, background: rc.bg, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: rc.text, fontWeight: 600 }}>
                  {u.role.replace(/_/g, ' ')}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>{u.department ?? '—'}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: u.is_active ? '#4ade80' : '#fb7185' }}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
