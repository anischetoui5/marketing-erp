import { api } from './api';
import { portalApi } from './api';

export interface Report {
  id: string;
  status: 'generating' | 'ready' | 'failed';
  periodStart: string;
  periodEnd: string;
  executiveSummary: string | null;
  performanceOverview: string | null;
  keyInsights: { title: string; body: string }[] | null;
  recommendations: { title: string; body: string }[] | null;
  conclusion: string | null;
  sharedWithClient: boolean;
  sharedAt: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  clientName: string;
  createdBy: string;
}

export async function createReport(body: {
  projectId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ reportId: string; status: string }> {
  const res = await api.post('/api/reports', body);
  return res.data.data;
}

export async function getReports(params?: {
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Report[]; total: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const res = await api.get(`/api/reports?${query}`);
  return res.data.data;
}

export async function getReport(id: string): Promise<Report> {
  const res = await api.get(`/api/reports/${id}`);
  return res.data.data;
}

export async function shareReport(id: string): Promise<Report> {
  const res = await api.patch(`/api/reports/${id}/share`);
  return res.data.data;
}

export async function getPortalReport(id: string): Promise<Report> {
  const res = await portalApi.get(`/api/reports/${id}`);
  return res.data.data;
}

export async function startSync(projectId: string): Promise<{ message: string; syncJobId: string }> {
  const res = await api.post(`/api/meta/sync/${projectId}`);
  return res.data.data;
}

export async function getSyncStatus(projectId: string) {
  const res = await api.get(`/api/meta/sync/${projectId}/status`);
  return res.data.data;
}
