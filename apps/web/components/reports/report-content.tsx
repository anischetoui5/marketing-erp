'use client';

import { motion } from 'framer-motion';
import { InsightCard } from '../insights/insight-card';
import type { Report } from '@/lib/reports';

interface ReportContentProps { report: Report; showMeta?: boolean; }

export function ReportContent({ report, showMeta = true }: ReportContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Executive Summary */}
      {report.executiveSummary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Executive Summary</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.7 }}>
            {report.executiveSummary}
          </p>
        </motion.div>
      )}

      {/* Performance Overview */}
      {report.performanceOverview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 10 }}>Performance Overview</p>
          {report.performanceOverview.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text)', lineHeight: 1.8, marginBottom: 10 }}>{para}</p>
          ))}
        </motion.div>
      )}

      {/* Key Insights */}
      {report.keyInsights && report.keyInsights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 12 }}>Key Insights</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {report.keyInsights.map((ins, i) => (
              <InsightCard key={i} title={ins.title} body={ins.body} color="#7B6CF0" index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 12 }}>Recommendations</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {report.recommendations.map((rec, i) => (
              <InsightCard key={i} title={rec.title} body={rec.body} color="#4ade80" index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px' }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 8 }}>Conclusion</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', lineHeight: 1.8, fontStyle: 'italic' }}>
            {report.conclusion}
          </p>
        </motion.div>
      )}

      {/* Meta info */}
      {showMeta && (report.costUsd || report.promptTokens) && (
        <div style={{ display: 'flex', gap: 16, paddingTop: 8 }}>
          {report.costUsd && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>AI cost: ${report.costUsd.toFixed(4)}</span>}
          {report.promptTokens && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)' }}>Tokens: {(report.promptTokens + (report.completionTokens ?? 0)).toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
