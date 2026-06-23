'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, width = 480, children }: DrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn('fixed inset-0 z-40 transition-opacity duration-300', open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn('fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}
        style={{ width, background: 'var(--panel)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {title && (
            <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded ml-auto shrink-0"
            style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
