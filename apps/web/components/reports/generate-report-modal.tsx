'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader } from 'lucide-react';
import { createReport, getReport } from '@/lib/reports';
import { getProjects } from '@/lib/projects';
import { ReportStatusBadge } from './report-status-badge';

interface Project { id: string; name: string; }

interface GenerateReportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateReportModal({ onClose, onSuccess }: GenerateReportModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects({ status: 'active', limit: 50 })
      .then((res) => setProjects((res.items ?? res).slice(0, 50).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!projectId || !periodStart || !periodEnd) { setError('All fields required'); return; }
    setError('');
    setLoading(true);
    try {
      const { reportId } = await createReport({ projectId, periodStart, periodEnd });
      setLoading(false);
      setPolling(true);
      setPollStatus('generating');
      const interval = setInterval(async () => {
        const rep = await getReport(reportId);
        setPollStatus(rep.status);
        if (rep.status !== 'generating') {
          clearInterval(interval);
          setPolling(false);
          onSuccess();
          onClose();
        }
      }, 3000);
    } catch {
      setError('Failed to create report');
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: 'var(--surface-2)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
    fontFamily: "'DM Mono', monospace", fontSize: 11, outline: 'none',
  };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          style={{ width: 440, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, padding: 28, boxShadow: 'var(--card-shadow)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} style={{ color: '#7B6CF0' }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Generate Report</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={16} /></button>
          </div>

          {polling ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader size={28} style={{ color: '#7B6CF0', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', marginBottom: 10 }}>Claude is writing your report…</p>
              <ReportStatusBadge status={pollStatus} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Period Start</label>
                  <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Period End</label>
                  <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fb7185' }}>{error}</p>}
              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ padding: '10px', background: 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating…' : 'Generate Report'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
