import { portalApi } from './api';

export interface PortalProject {
  id: string;
  name: string;
  objective: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budgetTotal: number | null;
  budgetCurrency: string;
  createdAt: string;
  client: { id: string; companyName: string };
}

export interface PortalTask {
  id: string;
  title: string;
  description: string | null;
  department: string;
  status: string;
  priority: string;
  dueDate: string | null;
  clientApproval: string;
  clientRejectionComment: string | null;
  clientReviewedAt: string | null;
  assignees: Array<{ id: string; fullName: string; role: string }>;
}

export interface PortalProjectDetail extends PortalProject {
  tasks: PortalTask[];
}

export async function getPortalProjects(): Promise<PortalProject[]> {
  const { data } = await portalApi.get('/api/portal/projects');
  return data.data;
}

export async function getPortalProject(id: string): Promise<PortalProjectDetail | null> {
  const { data } = await portalApi.get(`/api/portal/projects/${id}`);
  return data.data;
}

export interface PortalReportSummary {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  sharedAt: string | null;
  createdAt: string;
  project: { id: string; name: string };
}

export async function getPortalProjectReports(projectId: string): Promise<PortalReportSummary[]> {
  const { data } = await portalApi.get(`/api/portal/projects/${projectId}/reports`);
  return data.data;
}

export async function reviewPortalTask(
  projectId: string,
  taskId: string,
  decision: 'client_approved' | 'client_rejected',
  comment?: string,
): Promise<void> {
  await portalApi.post(`/api/portal/projects/${projectId}/tasks/${taskId}/review`, {
    decision,
    comment,
  });
}
