import { io, Socket } from "socket.io-client";
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || window.location.origin;
export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"],
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}