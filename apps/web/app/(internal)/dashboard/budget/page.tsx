'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, Trash2, X, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getProjects, type Project } from '@/lib/projects';
import {
  getBudgetSummary,
  getBudgetEntries,
  createBudgetEntry,
  deleteBudgetEntry,
  type BudgetSummary,
  type BudgetEntry,
} from '@/lib/budget';

const CATEGORY_LABELS: Record<string, string> = {
  ad_spend: 'Ad Spend',
  production: 'Production',
  design: 'Design',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  ad_spend: '#7B6CF0',
  production: '#4ade80',
  design: '#fb923c',
  other: '#94a3b8',
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-2)',
  display: 'block',
  marginBottom: 6,
};

function AddEntryModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('ad_spend');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!entryDate) { setError('Entry date is required'); return; }
    setError('');
    setLoading(true);
    try {
      await createBudgetEntry(projectId, {
        amount: amt,
        category,
        description: description || undefined,
        entryDate,
      });
      onSuccess();
      onClose();
    } catch {
      setError('Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          style={{ width: 420, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, padding: 28, boxShadow: 'var(--card-shadow)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={15} style={{ color: '#7B6CF0' }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Add Budget Entry</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div>
              <label style={LABEL_STYLE}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={INPUT_STYLE}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Facebook campaign spend"
                style={INPUT_STYLE}
              />
            </div>

            {error && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fb7185', margin: 0 }}>{error}</p>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ padding: '10px', background: 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Adding…' : 'Add Entry'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function BudgetPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    getProjects({ limit: 100 })
      .then((res) => {
        setProjects(res.items);
        if (res.items.length > 0) setProjectId(res.items[0].id);
      })
      .catch(() => {});
  }, [user, router]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoadingData(true);
    try {
      const [s, e] = await Promise.all([
        getBudgetSummary(projectId),
        getBudgetEntries(projectId),
      ]);
      setSummary(s);
      setEntries(e);
    } catch {
      // silent
    } finally {
      setLoadingData(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteBudgetEntry(projectId, id);
      await load();
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const currency = summary?.currency ?? 'USD';

  const summaryCards = [
    { label: 'Total Budget', value: summary?.budgetTotal != null ? fmt(summary.budgetTotal, currency) : '—', color: '#7B6CF0' },
    { label: 'Total Spent',  value: fmt(summary?.totalSpent ?? 0, currency), color: '#fb923c' },
    { label: 'Remaining',    value: summary?.remaining != null ? fmt(summary.remaining, currency) : '—', color: '#4ade80' },
    { label: 'Budget Used',  value: summary?.percentUsed != null ? `${summary.percentUsed.toFixed(1)}%` : '—', color: '#60a5fa' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Budget</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0 }}>Track project spending by category</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none', cursor: 'pointer' }}
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {canManage && (
            <motion.button
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase' }}
            >
              <Plus size={13} /> Add Entry
            </motion.button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}
          >
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', margin: 0, marginBottom: 8 }}>{card.label}</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: card.color, margin: 0 }}>
              {loadingData ? '—' : card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Category breakdown */}
      {summary && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', margin: 0, marginBottom: 14 }}>Spending by Category</p>

          {/* Overall progress bar */}
          {summary.budgetTotal != null && (
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(summary.percentUsed ?? 0, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: (summary.percentUsed ?? 0) > 90
                    ? '#fb7185'
                    : 'linear-gradient(90deg, #4E5ABF, #7B6CF0)',
                  borderRadius: 99,
                }}
              />
            </div>
          )}

          {/* Per-category rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const spent = summary.byCategory[key] ?? 0;
              const pct = summary.budgetTotal ? (spent / summary.budgetTotal) * 100 : 0;
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-2)', letterSpacing: '0.05em' }}>{label}</span>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ height: '100%', background: CATEGORY_COLORS[key], borderRadius: 99 }}
                    />
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-2)', textAlign: 'right' }}>
                    {fmt(spent, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 110px 110px 1fr 140px 40px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Date', 'Category', 'Amount', 'Description', 'Added By', ''].map((h) => (
            <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
          ))}
        </div>

        {loadingData ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 1, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 9, flex: 2, borderRadius: 4 }} />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 10 }}>
            <TrendingUp size={28} style={{ color: 'var(--text-3)' }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
              No budget entries yet.{canManage ? ' Add your first entry above.' : ''}
            </p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{ display: 'grid', gridTemplateColumns: '120px 110px 110px 1fr 140px 40px', alignItems: 'center', padding: '13px 20px', borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
                {entry.entryDate}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: CATEGORY_COLORS[entry.category], flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
                  {CATEGORY_LABELS[entry.category]}
                </span>
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                {fmt(entry.amount, currency)}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                {entry.description ?? '—'}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.createdBy?.fullName ?? '—'}
              </span>
              {canManage ? (
                <motion.button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deleting === entry.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{ background: 'none', border: 'none', cursor: deleting === entry.id ? 'not-allowed' : 'pointer', color: deleting === entry.id ? 'var(--text-3)' : '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                >
                  <Trash2 size={13} />
                </motion.button>
              ) : (
                <span />
              )}
            </motion.div>
          ))
        )}
      </div>

      {showModal && projectId && (
        <AddEntryModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
