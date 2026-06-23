'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', maxWidth: 400 }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 72,
            fontWeight: 700,
            color: 'var(--accent)',
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 10,
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: 'var(--text-2)',
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 8,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          <ArrowLeft size={12} />
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
