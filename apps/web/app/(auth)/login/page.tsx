'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { loginInternal, getApiError } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await loginInternal(data.email, data.password);
      router.push('/dashboard');
    } catch (err) {
      setServerError(getApiError(err));
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F2F8' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: '#0c0a1a', position: 'relative', overflow: 'hidden' }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(78,90,191,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '60px',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(126,11,28,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="flex items-center gap-3 relative">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#4E5ABF' }}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-base uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '0.2em' }}>
            MarketingERP
          </span>
        </div>

        <div className="relative">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#4E5ABF', letterSpacing: '0.3em', fontFamily: "'DM Mono', monospace" }}>
            Agency Platform — 2025
          </p>
          <h1 className="text-5xl font-black text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}>
            Manage your<br />agency with<br /><span style={{ color: '#4E5ABF' }}>confidence.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
            Projects, clients, tasks, and team —<br />all in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 relative">
          {['Client Management', 'Project Tracking', 'Team Collaboration', 'Audit Logs'].map((f) => (
            <div key={f} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px', padding: '14px 16px' }}>
              <p className="text-white text-xs font-medium" style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#1C0E42' }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>
              MarketingERP
            </span>
          </div>

          <h2 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42' }}>Welcome back</h2>
          <p className="mt-1 text-xs" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.05em' }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.6)', letterSpacing: '0.14em' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(28,14,66,0.3)' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                  className="w-full pl-9 pr-4 py-2.5 text-sm outline-none transition"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(28,14,66,0.15)',
                    borderRadius: '2px',
                    color: '#1C0E42',
                    fontFamily: "'DM Mono', monospace",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#4E5ABF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(78,90,191,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(28,14,66,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs" style={{ color: '#7E0B1C' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.6)', letterSpacing: '0.14em' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(28,14,66,0.3)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full pl-9 pr-4 py-2.5 text-sm outline-none transition"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(28,14,66,0.15)',
                    borderRadius: '2px',
                    color: '#1C0E42',
                    fontFamily: "'DM Mono', monospace",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#4E5ABF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(78,90,191,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(28,14,66,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs" style={{ color: '#7E0B1C' }}>{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="flex items-start gap-2.5 px-4 py-3" style={{ background: 'rgba(126,11,28,0.06)', border: '1px solid rgba(126,11,28,0.2)', borderRadius: '2px' }}>
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#7E0B1C' }} />
                <p className="text-xs" style={{ color: '#7E0B1C', fontFamily: "'DM Mono', monospace" }}>{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 mt-2 transition-all"
              style={{
                background: isSubmitting ? '#3D1F5F' : '#1C0E42',
                borderRadius: '2px',
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.1em',
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = '#3D1F5F'; }}
              onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = '#1C0E42'; }}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] uppercase tracking-widest" style={{ color: 'rgba(28,14,66,0.3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.2em' }}>
            MarketingERP — Agency Platform
          </p>
        </div>
      </div>
    </div>
  );
}
