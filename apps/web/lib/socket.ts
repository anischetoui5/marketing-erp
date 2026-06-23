'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectNotificationSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/notifications`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectNotificationSocket() {
  socket?.disconnect();
  socket = null;
}

export function getNotificationSocket(): Socket | null {
  return socket;
}
