'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useThemeStore } from '@/store/theme.store';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useThemeStore((s) => s.theme);

  // Sync data-theme on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', transition: 'background 0.4s ease' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ padding: '28px', minHeight: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
