'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, FolderKanban, LogOut, Zap } from 'lucide-react';
import { usePortalAuthStore } from '@/store/auth.store';
import { logoutPortal } from '@/lib/auth';

const NAV = [
  { href: '/portal/dashboard/projects', label: 'My Projects', icon: FolderKanban },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = usePortalAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logoutPortal();
    router.push('/portal/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F2F8' }}>
      <aside
        className="flex flex-col w-56 min-h-screen shrink-0"
        style={{ background: '#0c0a1a', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#4E5ABF' }}>
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-xs leading-tight" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Client Portal
            </p>
            <p className="text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>MarketingERP</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all"
                style={
                  active
                    ? { background: '#4E5ABF', color: '#fff', borderLeft: '2px solid #4E5ABF' }
                    : { color: 'rgba(255,255,255,0.4)', borderLeft: '2px solid transparent' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        {user && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: '#3D1F5F', border: '1px solid #4E5ABF' }}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate" style={{ fontFamily: "'Syne', sans-serif" }}>{user.fullName}</p>
                <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7E0B1C'; (e.currentTarget as HTMLElement).style.background = 'rgba(126,11,28,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="h-14 flex items-center justify-between px-6 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid rgba(28,14,66,0.1)' }}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" style={{ color: '#4E5ABF' }} />
            <h1 className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42', letterSpacing: '0.18em' }}>
              Client Portal
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#1C0E42' }}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs hidden sm:block" style={{ fontFamily: "'DM Mono', monospace", color: '#1C0E42' }}>{user.fullName}</span>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
