import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
  const { data } = await api.get('/api/notifications', { params });
  return data.data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/api/notifications/unread-count');
  return data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}
