import { api } from './api';

export interface Assignee {
  id: string;
  fullName: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department: string;
  status: string;
  priority: string;
  dueDate: string | null;
  revisionCount: number;
  projectId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; clientName?: string };
  assignees: Assignee[];
  commentsCount: number;
}

export interface TasksPage {
  items: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; fullName: string; role: string };
}

export async function getTasks(params?: {
  projectId?: string;
  status?: string;
  priority?: string;
  department?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
}): Promise<TasksPage> {
  const { data } = await api.get('/api/tasks', { params });
  return data.data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get(`/api/tasks/${id}`);
  return data.data;
}

export async function createTask(body: {
  projectId: string;
  title: string;
  description?: string;
  department: string;
  priority?: string;
  dueDate?: string;
  assigneeIds?: string[];
}): Promise<Task> {
  const { data } = await api.post('/api/tasks', body);
  return data.data;
}

export async function updateTaskStatus(
  id: string,
  status: string,
): Promise<{ id: string; status: string; revisionCount: number }> {
  const { data } = await api.patch(`/api/tasks/${id}/status`, { status });
  return data.data;
}

export async function updateTask(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    assigneeIds: string[];
  }>,
): Promise<Task> {
  const { data } = await api.patch(`/api/tasks/${id}`, body);
  return data.data;
}

export async function deleteTask(id: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/tasks/${id}`);
  return data.data;
}

export async function getComments(
  taskId: string,
  params?: { page?: number; limit?: number },
): Promise<{ items: Comment[]; total: number; page: number; limit: number; totalPages: number }> {
  const { data } = await api.get(`/api/tasks/${taskId}/comments`, { params });
  return data.data;
}

export async function addComment(taskId: string, body: string): Promise<Comment> {
  const { data } = await api.post(`/api/tasks/${taskId}/comments`, { body });
  return data.data;
}

export async function deleteComment(taskId: string, commentId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/tasks/${taskId}/comments/${commentId}`);
  return data.data;
}
