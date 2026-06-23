import { api } from './api';

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string } | null;
}

export async function getAttachments(taskId: string): Promise<Attachment[]> {
  const { data } = await api.get(`/api/tasks/${taskId}/attachments`);
  return data.data;
}

export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/api/tasks/${taskId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function getDownloadUrl(taskId: string, attachmentId: string): Promise<string> {
  const { data } = await api.get(`/api/tasks/${taskId}/attachments/${attachmentId}/url`);
  return data.data.url;
}

export async function deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
  await api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
