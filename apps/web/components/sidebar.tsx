'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  BarChart2,
  ScrollText,
  Building2,
  Zap,
  ChevronLeft,
  BotMessageSquare,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '@/store/auth.store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  roles: UserRole[];
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',             label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','marketing_manager','marketing_agent','production_manager','production_agent'], group: 'main' },
  { href: '/dashboard/clients',     label: 'Clients',   icon: Building2,       roles: ['admin','marketing_manager'], group: 'work' },
  { href: '/dashboard/projects',    label: 'Projects',  icon: FolderKanban,    roles: ['admin','marketing_manager','marketing_agent','production_manager','production_agent'], group: 'work' },
  { href: '/dashboard/tasks',       label: 'Tasks',     icon: CheckSquare,     roles: ['admin','marketing_manager','marketing_agent','production_manager','production_agent'], group: 'work' },
  { href: '/dashboard/calendar',   label: 'Calendar',  icon: CalendarDays,    roles: ['admin','marketing_manager','marketing_agent','production_manager','production_agent'], group: 'work' },
  { href: '/dashboard/reports',     label: 'Reports',   icon: BarChart2,          roles: ['admin','marketing_manager'], group: 'insights' },
  { href: '/dashboard/budget',      label: 'Budget',    icon: DollarSign,         roles: ['admin','marketing_manager'], group: 'insights' },
  { href: '/dashboard/chat',        label: 'AI Assistant', icon: BotMessageSquare, roles: ['admin','marketing_manager','marketing_agent','production_manager','production_agent'], group: 'insights' },
  { href: '/dashboard/users',       label: 'Users',     icon: Users,           roles: ['admin', 'marketing_manager', 'production_manager'], group: 'admin' },
  { href: '/dashboard/audit-log',   label: 'Audit Log', icon: ScrollText,      roles: ['admin'], group: 'admin' },
];

const GROUP_LABELS: Record<string, string> = {
  main: '', work: 'Workspace', insights: 'Insights', admin: 'Administration',
};

const COLLAPSED_W = 64;
const EXPANDED_W  = 240;

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const groups = Array.from(new Set(visibleItems.map((i) => i.group ?? 'main')));

  return (
    <motion.aside
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col min-h-screen shrink-0 overflow-hidden"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 shrink-0"
        style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.07)', gap: 12 }}
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #4E5ABF 0%, #7B6CF0 100%)', boxShadow: '0 0 16px rgba(78,90,191,0.4)' }}
        >
          <Zap size={15} className="text-white" />
        </motion.div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <p className="font-bold text-white leading-tight"
                style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                MarketingERP
              </p>
              <p className="leading-tight" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.1em' }}>
                Agency Platform
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden" style={{ padding: collapsed ? '16px 8px' : '16px 10px' }}>
        {groups.map((group, gi) => {
          const items = visibleItems.filter((i) => (i.group ?? 'main') === group);
          return (
            <div key={group} style={{ marginBottom: 20 }}>
              <AnimatePresence initial={false}>
                {!collapsed && GROUP_LABELS[group] && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      color: 'rgba(255,255,255,0.18)',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      paddingLeft: 12,
                      marginBottom: 6,
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </motion.p>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map((item, idx) => {
                  const Icon = item.icon;
                  const active =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: gi * 0.04 + idx * 0.03, duration: 0.22 }}
                    >
                      <Link href={item.href} title={collapsed ? item.label : undefined}>
                        <motion.div
                          whileHover={{ x: collapsed ? 0 : 3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: collapsed ? '8px 0' : '8px 12px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            borderRadius: 7,
                            cursor: 'pointer',
                            position: 'relative',
                            background: active ? 'rgba(78,90,191,0.18)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                          className="nav-item"
                        >
                          {active && (
                            <motion.div
                              layoutId="nav-active-pill"
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: 7,
                                background: 'linear-gradient(135deg, rgba(78,90,191,0.3) 0%, rgba(123,108,240,0.15) 100%)',
                                border: '1px solid rgba(78,90,191,0.4)',
                              }}
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}
                          <Icon
                            size={16}
                            style={{
                              color: active ? '#7B6CF0' : 'rgba(255,255,255,0.35)',
                              flexShrink: 0,
                              position: 'relative',
                              zIndex: 1,
                              transition: 'color 0.15s ease',
                            }}
                          />
                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: 11,
                                  letterSpacing: '0.07em',
                                  textTransform: 'uppercase',
                                  color: active ? '#fff' : 'rgba(255,255,255,0.38)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  position: 'relative',
                                  zIndex: 1,
                                  transition: 'color 0.15s ease',
                                }}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: collapsed ? '12px 8px' : '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              height: 30,
              width: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3D1F5F 0%, #4E5ABF 100%)',
              border: '1px solid rgba(78,90,191,0.5)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}
              >
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Collapse toggle */}
      <motion.button
        onClick={() => setCollapsed((c) => !c)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        style={{
          position: 'absolute',
          top: 16,
          right: -11,
          height: 22,
          width: 22,
          borderRadius: '50%',
          background: '#1a1630',
          border: '1px solid rgba(78,90,191,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
          <ChevronLeft size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}
