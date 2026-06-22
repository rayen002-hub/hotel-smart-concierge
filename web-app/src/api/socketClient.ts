import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

let socket: Socket | null = null;

// ─── Token keys (same as apiClient.ts) ──────────────────────────────

const STAFF_TOKEN_KEY = 'staff_token';
const CLIENT_TOKEN_KEY = 'client_room_token';

// ─── Connect ────────────────────────────────────────────────────────

/**
 * Connecter en tant que staff (JWT).
 */
export function connectStaffSocket(): Socket {
  if (socket?.connected) return socket;

  const token = localStorage.getItem(STAFF_TOKEN_KEY);
  if (!token) throw new Error('No staff token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[Socket] Staff connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Connecter en tant que client (X-Client-Room-Token).
 */
export function connectClientSocket(): Socket {
  if (socket?.connected) return socket;

  const clientRoomToken = sessionStorage.getItem(CLIENT_TOKEN_KEY);
  if (!clientRoomToken) throw new Error('No client room token');

  socket = io(SOCKET_URL, {
    auth: { clientRoomToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[Socket] Client connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Recuperer le socket actif.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Deconnecter le socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
