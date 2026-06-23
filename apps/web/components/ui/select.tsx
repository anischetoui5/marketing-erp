'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-2)' }}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn('h-9 w-full px-3 text-sm outline-none transition-colors', className)}
        style={{
          background: 'var(--surface)',
          border: error ? '1px solid #fb7185' : '1px solid var(--border)',
          color: 'var(--text)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
          borderRadius: 6,
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p style={{ color: '#fb7185', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>{error}</p>
      )}
    </div>
  ),
);
Select.displayName = 'Select';
