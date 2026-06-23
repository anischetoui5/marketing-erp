import { api } from './api';

export interface AnalyticsSummary {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  totalConversionValue: number;
  totalReach: number;
  avgCtr: number | null;
  avgCpc: number | null;
  avgCpa: number | null;
  avgRoas: number | null;
  avgCpm: number | null;
  campaignCount: number;
  dateRange: { from: string | null; to: string | null };
}

export interface CampaignRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  cpm: number | null;
}

export interface DailyRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number | null;
  roas: number | null;
}

export async function getAnalyticsSummary(
  projectId: string,
  params?: { dateFrom?: string; dateTo?: string; campaignId?: string },
): Promise<AnalyticsSummary> {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  if (params?.campaignId) query.set('campaignId', params.campaignId);
  const res = await api.get(`/api/analytics/${projectId}/summary?${query}`);
  return res.data.data;
}

export async function getAnalyticsCampaigns(
  projectId: string,
  params?: { dateFrom?: string; dateTo?: string },
): Promise<CampaignRow[]> {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  const res = await api.get(`/api/analytics/${projectId}/campaigns?${query}`);
  return res.data.data;
}

export async function getAnalyticsDaily(
  projectId: string,
  params?: { dateFrom?: string; dateTo?: string },
): Promise<DailyRow[]> {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  const res = await api.get(`/api/analytics/${projectId}/daily?${query}`);
  return res.data.data;
}

export async function getLatestInsight(projectId: string) {
  const res = await api.get(`/api/projects/${projectId}/insights/latest`);
  return res.data.data;
}
