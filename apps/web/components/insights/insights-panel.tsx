'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { InsightCard } from './insight-card';

interface Insight { title: string; body: string; }

interface InsightsPanelProps {
  insight: {
    summary: string | null;
    insights: Insight[] | null;
    recommendations: Insight[] | null;
    generatedAt: string;
  } | null;
  loading?: boolean;
}

export function InsightsPanel({ insight, loading }: InsightsPanelProps) {
  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
        <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 4, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 9, width: '90%', borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 9, width: '75%', borderRadius: 4 }} />
      </div>
    );
  }

  if (!insight) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
        <Sparkles size={24} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>
          Run a sync to generate AI insights
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Sparkles size={14} style={{ color: '#7B6CF0' }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Insights</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {new Date(insight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Summary */}
      {insight.summary && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
            {insight.summary}
          </p>
        </div>
      )}

      {/* Insights + Recommendations grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>Insights</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(insight.insights ?? []).map((ins, i) => (
              <InsightCard key={i} title={ins.title} body={ins.body} color="#7B6CF0" index={i} />
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(insight.recommendations ?? []).map((rec, i) => (
              <InsightCard key={i} title={rec.title} body={rec.body} color="#4ade80" index={i} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
