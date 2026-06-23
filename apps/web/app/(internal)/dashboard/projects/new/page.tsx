'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { createProject } from '@/lib/projects';
import { api } from '@/lib/api';
import { Select } from '@/components/ui/select';

interface Client { id: string; companyName: string; }

const OBJECTIVES = [
  { value: 'awareness',   label: 'Brand Awareness' },
  { value: 'engagement',  label: 'Engagement' },
  { value: 'traffic',     label: 'Traffic' },
  { value: 'leads',       label: 'Lead Generation' },
  { value: 'sales',       label: 'Sales' },
  { value: 'conversions', label: 'Conversions' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    name: '',
    objective: 'awareness',
    startDate: '',
    endDate: '',
    budgetTotal: '',
    budgetCurrency: 'USD',
    metaAdsAccountId: '',
  });

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin' && user.role !== 'marketing_manager') {
      router.replace('/dashboard/projects');
    }
  }, [user, router]);

  useEffect(() => {
    api.get('/api/clients?limit=100')
      .then(({ data }) => setClients(
        (data.data?.items ?? []).map((c: { id: string; company_name?: string; companyName?: string }) => ({
          id: c.id,
          companyName: c.companyName ?? c.company_name ?? '',
        }))
      ))
      .catch(console.error);
  }, []);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.name || !form.objective) {
      setError('Client, name, and objective are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const project = await createProject({
        clientId: form.clientId,
        name: form.name.trim(),
        objective: form.objective,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budgetTotal: form.budgetTotal ? parseFloat(form.budgetTotal) : undefined,
        budgetCurrency: form.budgetCurrency || 'USD',
        metaAdsAccountId: form.metaAdsAccountId.trim() || undefined,
      });
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to create project'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-xs"
        style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Projects
      </Link>

      <div style={{ background: '#fff', border: '1px solid rgba(28,14,66,0.1)', borderTop: '2px solid #1C0E42' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(28,14,66,0.06)' }}>
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", color: '#1C0E42', letterSpacing: '0.18em' }}>
            New Project
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 text-xs" style={{ background: 'rgba(126,11,28,0.06)', border: '1px solid rgba(126,11,28,0.2)', color: '#7E0B1C', fontFamily: "'DM Mono', monospace" }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5">
            {/* Client */}
            <Select
              label="Client *"
              value={form.clientId}
              onChange={(e) => set('clientId', e.target.value)}
              required
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </Select>

            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.2em' }}>
                Project Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Summer Campaign 2025"
                className="h-9 px-3 text-sm border outline-none w-full"
                style={{ border: '1px solid rgba(28,14,66,0.2)', color: '#1C0E42', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
              />
            </div>

            {/* Objective */}
            <Select
              label="Objective *"
              value={form.objective}
              onChange={(e) => set('objective', e.target.value)}
              required
            >
              {OBJECTIVES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.2em' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  className="h-9 px-3 text-sm border outline-none w-full"
                  style={{ border: '1px solid rgba(28,14,66,0.2)', color: '#1C0E42', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.2em' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  className="h-9 px-3 text-sm border outline-none w-full"
                  style={{ border: '1px solid rgba(28,14,66,0.2)', color: '#1C0E42', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.2em' }}>
                  Budget
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budgetTotal}
                  onChange={(e) => set('budgetTotal', e.target.value)}
                  placeholder="0.00"
                  className="h-9 px-3 text-sm border outline-none w-full"
                  style={{ border: '1px solid rgba(28,14,66,0.2)', color: '#1C0E42', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
                />
              </div>
              <Select
                label="Currency"
                value={form.budgetCurrency}
                onChange={(e) => set('budgetCurrency', e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="MAD">MAD</option>
              </Select>
            </div>

            {/* Meta Ads */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.5)', letterSpacing: '0.2em' }}>
                Meta Ads Account ID
              </label>
              <input
                type="text"
                value={form.metaAdsAccountId}
                onChange={(e) => set('metaAdsAccountId', e.target.value)}
                placeholder="act_000000000"
                className="h-9 px-3 text-sm border outline-none w-full"
                style={{ border: '1px solid rgba(28,14,66,0.2)', color: '#1C0E42', fontFamily: "'DM Mono', monospace", fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: '#1C0E42', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#3D1F5F'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1C0E42'; }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
            <Link
              href="/dashboard/projects"
              className="px-4 py-2.5 text-xs border"
              style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(28,14,66,0.6)', borderColor: 'rgba(28,14,66,0.2)' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
