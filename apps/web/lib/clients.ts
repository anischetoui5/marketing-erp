import { api } from './api';

export interface Client {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  industry: string | null;
  isArchived: boolean;
  createdAt: string;
}

export async function getClients(params?: { search?: string; page?: number; limit?: number }): Promise<{ items: Client[]; total: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const res = await api.get(`/api/clients?${query}`);
  const raw = res.data.data;
  const items = (raw.items ?? raw).map((c: Record<string, unknown>) => ({
    id: c.id,
    companyName: c.company_name ?? c.companyName,
    contactName: c.contact_name ?? c.contactName ?? null,
    contactEmail: c.contact_email ?? c.contactEmail ?? null,
    industry: c.industry ?? null,
    isArchived: c.is_archived ?? c.isArchived ?? false,
    createdAt: c.created_at ?? c.createdAt,
  }));
  return { items, total: raw.total ?? items.length, totalPages: raw.totalPages ?? 1 };
}
