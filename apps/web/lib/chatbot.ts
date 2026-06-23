import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(messages: ChatMessage[]): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
  const { data } = await api.post('/api/chatbot/message', { messages });
  return data.data;
}
