import { api } from './api';

export interface Project {
  id: string;
  name: string;
  objective: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budgetTotal: number | null;
  budgetCurrency: string;
  metaAdsAccountId: string | null;
  clientId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; companyName: string };
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
  addedAt: string;
}

export interface ProjectDetail extends Project {
  team: TeamMember[];
}

export interface ProjectsPage {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getProjects(params?: {
  clientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ProjectsPage> {
  const { data } = await api.get('/api/projects', { params });
  return data.data;
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const { data } = await api.get(`/api/projects/${id}`);
  return data.data;
}

export async function createProject(body: {
  clientId: string;
  name: string;
  objective: string;
  startDate?: string;
  endDate?: string;
  budgetTotal?: number;
  budgetCurrency?: string;
  metaAdsAccountId?: string;
}): Promise<Project> {
  const { data } = await api.post('/api/projects', body);
  return data.data;
}

export async function updateProject(
  id: string,
  body: Partial<{
    name: string;
    objective: string;
    status: string;
    startDate: string;
    endDate: string;
    budgetTotal: number;
    budgetCurrency: string;
    metaAdsAccountId: string;
  }>,
): Promise<Project> {
  const { data } = await api.patch(`/api/projects/${id}`, body);
  return data.data;
}

export async function deleteProject(id: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/projects/${id}`);
  return data.data;
}

export async function addTeamMembers(
  projectId: string,
  userIds: string[],
): Promise<{ projectId: string; team: TeamMember[] }> {
  const { data } = await api.post(`/api/projects/${projectId}/team`, { userIds });
  return data.data;
}

export async function removeTeamMember(
  projectId: string,
  userId: string,
): Promise<{ projectId: string; team: TeamMember[] }> {
  const { data } = await api.delete(`/api/projects/${projectId}/team/${userId}`);
  return data.data;
}
