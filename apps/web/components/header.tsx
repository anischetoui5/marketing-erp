'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Bell, X, Check, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { logoutInternal } from '@/lib/auth';
import {
  getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
  type Notification,
} from '@/lib/notifications';
import { connectNotificationSocket, disconnectNotificationSocket } from '@/lib/socket';

const ROLE_LABELS: Record<string, string> = {
  admin:               'Admin',
  marketing_manager:   'Marketing Manager',
  marketing_agent:     'Marketing Agent',
  production_manager:  'Production Manager',
  production_agent:    'Production Agent',
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':             'Dashboard',
  '/dashboard/clients':     'Clients',
  '/dashboard/projects':    'Projects',
  '/dashboard/tasks':       'Tasks',
  '/dashboard/calendar':    'Calendar',
  '/dashboard/reports':     'Reports',
  '/dashboard/chat':        'AI Assistant',
  '/dashboard/users':       'Users',
  '/dashboard/audit-log':   'Audit Log',
};

export function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);
  const { theme, toggle } = useThemeStore();

  const pageTitle = (() => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    if (pathname.startsWith('/dashboard/projects/')) return 'Projects';
    return 'Dashboard';
  })();

  // ── Notifications ──────────────────────────────────────────────────────────
  const [unread, setUnread]             = useState(0);
  const [open, setOpen]                 = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try { setUnread(await getUnreadCount()); } catch {}
  }, [user]);

  const accessToken = useAuthStore((s) => s.accessToken);

  // WebSocket for real-time notifications — fallback to initial fetch only
  useEffect(() => {
    if (!user) return;
    fetchUnread();

    if (!accessToken) return;

    const ws = connectNotificationSocket(accessToken);

    ws.on('notification', (data: { id: string; type: string; message: string; link?: string | null }) => {
      setUnread((u) => u + 1);
      setNotifications((prev) => [
        { id: data.id, type: data.type as Notification['type'], message: data.message, link: data.link ?? null, isRead: false, createdAt: new Date().toISOString() },
        ...prev.slice(0, 9),
      ]);
    });

    return () => { disconnectNotificationSocket(); };
  }, [user, accessToken, fetchUnread]);

  useEffect(() => {
    if (!open) return;
    setNotifLoading(true);
    getNotifications({ limit: 10 })
      .then((res) => setNotifications(res.items))
      .catch(console.error)
      .finally(() => setNotifLoading(false));
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string, link: string | null) => {
    try {
      await markNotificationRead(id);
      setNotifications((n) => n.map((x) => x.id === id ? { ...x, isRead: true } : x));
      setUnread((u) => Math.max(0, u - 1));
      if (link) { setOpen(false); router.push(link); }
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {}
  };

  const handleLogout = async () => {
    await logoutInternal();
    router.push('/login');
  };

  const isDark = theme === 'dark';

  return (
    <motion.header
      className="h-14 flex items-center justify-between px-6 shrink-0"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Page title */}
      <motion.h1
        key={pageTitle}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {pageTitle}
      </motion.h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme toggle */}
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{
            height: 32,
            width: 58,
            borderRadius: 16,
            background: isDark ? 'rgba(78,90,191,0.2)' : 'rgba(28,14,66,0.08)',
            border: isDark ? '1px solid rgba(78,90,191,0.35)' : '1px solid rgba(28,14,66,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            position: 'relative',
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          <motion.div
            animate={{ x: isDark ? 0 : 26 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              height: 24,
              width: 24,
              borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)'
                : 'linear-gradient(135deg, #F4B942 0%, #F07B2C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? '0 0 8px rgba(78,90,191,0.5)' : '0 0 8px rgba(240,123,44,0.5)',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div key="moon" initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 30, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <Moon size={12} style={{ color: '#fff' }} />
                </motion.div>
              ) : (
                <motion.div key="sun" initial={{ rotate: 30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -30, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <Sun size={12} style={{ color: '#fff' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.button>

        {/* Bell */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <motion.button
            onClick={() => setOpen((o) => !o)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{
              height: 32,
              width: 32,
              borderRadius: 8,
              background: open ? 'var(--accent-soft)' : 'transparent',
              border: '1px solid',
              borderColor: open ? 'var(--accent)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.15s ease',
              color: 'var(--text-2)',
            }}
          >
            <Bell size={15} />
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    height: 16,
                    minWidth: 16,
                    borderRadius: 8,
                    background: '#7E0B1C',
                    color: '#fff',
                    fontSize: 8,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 40,
                  width: 'min(308px, calc(100vw - 40px))',
                  zIndex: 50,
                  background: isDark ? 'rgba(18,14,38,0.95)' : 'rgba(255,255,255,0.98)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 12,
                  boxShadow: 'var(--card-shadow)',
                  backdropFilter: 'blur(16px)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                    Notifications
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {unread > 0 && (
                      <button
                        onClick={handleMarkAll}
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                      >
                        <Check size={10} /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} style={{ color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', padding: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>
                      Loading…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-3)' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => handleMarkRead(n.id, n.link)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: n.isRead ? 'transparent' : (isDark ? 'rgba(78,90,191,0.06)' : 'rgba(78,90,191,0.04)'),
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        {!n.isRead && (
                          <div style={{ height: 6, width: 6, borderRadius: '50%', background: '#4E5ABF', marginTop: 4, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: n.isRead ? 16 : 0 }}>
                          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)', lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                height: 30,
                width: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3D1F5F 0%, #4E5ABF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(78,90,191,0.3)',
              }}
            >
              {user.fullName.charAt(0).toUpperCase()}
            </motion.div>
            <div className="hidden sm:block">
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                {user.fullName}
              </p>
              <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.05em', fontFamily: "'DM Mono', monospace" }}>
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <motion.button
          onClick={handleLogout}
          title="Logout"
          whileHover={{ scale: 1.08 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7E0B1C'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
          whileTap={{ scale: 0.92 }}
          style={{
            height: 32,
            width: 32,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-3)',
          }}
        >
          <LogOut size={15} />
        </motion.button>
      </div>
    </motion.header>
  );
}
