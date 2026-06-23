'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getSyncStatus, startSync } from '@/lib/reports';

interface SyncJob {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  errorMsg: string | null;
}

interface SyncStatusBarProps {
  projectId: string;
  canSync: boolean;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function SyncStatusBar({ projectId, canSync }: SyncStatusBarProps) {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    try {
      const data = await getSyncStatus(projectId);
      setJob(data);
    } catch {
      // no syncs yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await startSync(projectId);
      await refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Sync failed';
      alert(msg);
    } finally {
      setSyncing(false);
    }
  };

  const StatusIcon = () => {
    if (!job) return <Clock size={12} style={{ color: 'var(--text-3)' }} />;
    if (job.status === 'running') return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw size={12} style={{ color: '#fbbf24' }} /></motion.div>;
    if (job.status === 'succeeded') return <CheckCircle size={12} style={{ color: '#4ade80' }} />;
    return <XCircle size={12} style={{ color: '#fb7185' }} />;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusIcon />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)' }}>
          {loading ? 'Loading…' : job
            ? `Last sync: ${timeAgo(job.finishedAt ?? job.startedAt)} · ${job.status}`
            : 'Never synced'}
        </span>
        {job?.status === 'failed' && job.errorMsg && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#fb7185', background: 'rgba(251,113,133,0.1)', padding: '2px 6px', borderRadius: 4 }}>
            {job.errorMsg.slice(0, 60)}
          </span>
        )}
      </div>
      {canSync && (
        <motion.button
          onClick={handleSync}
          disabled={syncing || job?.status === 'running'}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '6px 12px', borderRadius: 6, cursor: syncing || job?.status === 'running' ? 'not-allowed' : 'pointer',
            background: syncing ? 'var(--surface-2)' : 'var(--accent-soft)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)', opacity: syncing || job?.status === 'running' ? 0.5 : 1,
          }}
        >
          <RefreshCw size={10} />
          {syncing ? 'Starting…' : 'Sync Now'}
        </motion.button>
      )}
    </div>
  );
}
