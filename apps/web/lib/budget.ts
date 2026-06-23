import { api } from './api';

export interface BudgetEntry {
  id: string;
  projectId: string;
  amount: number;
  category: 'ad_spend' | 'production' | 'design' | 'other';
  description: string | null;
  entryDate: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
}

export interface BudgetSummary {
  budgetTotal: number | null;
  currency: string | null;
  totalSpent: number;
  remaining: number | null;
  percentUsed: number | null;
  byCategory: Record<string, number>;
}

export async function getBudgetSummary(projectId: string): Promise<BudgetSummary> {
  const { data } = await api.get(`/api/projects/${projectId}/budget/summary`);
  return data.data;
}

export async function getBudgetEntries(projectId: string): Promise<BudgetEntry[]> {
  const { data } = await api.get(`/api/projects/${projectId}/budget/entries`);
  return data.data;
}

export async function createBudgetEntry(
  projectId: string,
  payload: { amount: number; category: string; description?: string; entryDate: string },
): Promise<BudgetEntry> {
  const { data } = await api.post(`/api/projects/${projectId}/budget/entries`, {
    ...payload,
    projectId,
  });
  return data.data;
}

export async function deleteBudgetEntry(projectId: string, entryId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}/budget/entries/${entryId}`);
}
