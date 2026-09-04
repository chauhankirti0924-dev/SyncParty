import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/db';
import { setupRedisAdapter } from './config/redis';
import { registerSocketHandlers } from './socket/socketHandler';
import { RoomManager } from './domain/RoomManager';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types/events';

import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve production static React frontend if available
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// HTTP API Routes
app.get('/api/health', (req, res) => {
  const roomManager = RoomManager.getInstance();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    activeRooms: roomManager.getAllRoomsCount(),
    uptime: process.uptime()
  });
});

app.get('/api/rooms/:roomId', async (req, res) => {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room.toDTO());
});

app.post('/api/rooms', async (req, res) => {
  const roomManager = RoomManager.getInstance();
  const code = await roomManager.generateUniqueRoomCode();
  res.json({ roomId: code });
});

// Fallback SPA routing in production
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 20000,
  pingInterval: 10000
});

// Configure Redis adapter for multi-instance scaling
setupRedisAdapter(io);

// Register WebSocket handlers
registerSocketHandlers(io);

async function startServer() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Watch Party Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint ready for connections.`);
  });
}

startServer();

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Stopping server gracefully...');
  server.close(async () => {
    await disconnectDB();
    console.log('Server shut down completed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
