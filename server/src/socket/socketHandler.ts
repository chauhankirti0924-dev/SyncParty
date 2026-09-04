import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserRole,
  ChatMessageDTO,
  ReactionDTO
} from '../types/events';
import { RoomManager } from '../domain/RoomManager';
import { User } from '../domain/User';
import { PermissionGuard } from '../domain/PermissionGuard';

type CustomSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type CustomServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSocketHandlers(io: CustomServer): void {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (socket: CustomSocket) => {
    console.log(`🔌 Client connected: socket.id=${socket.id}`);

    // Generate session user ID
    socket.data.userId = socket.id;
    socket.data.username = 'Anonymous';
    socket.data.roomId = null;

    // --- EVENT: join_room ---
    socket.on('join_room', async ({ roomId, username, userId }) => {
      try {
        const cleanRoomId = roomId.toUpperCase().trim();
        const cleanUsername = username.trim() || `User_${socket.id.substring(0, 4)}`;
        const canonicalUserId = (userId && userId.trim()) ? userId.trim() : socket.id;

        // Leave existing room if any
        if (socket.data.roomId) {
          socket.leave(socket.data.roomId);
        }

        socket.data.userId = canonicalUserId;
        socket.data.username = cleanUsername;
        socket.data.roomId = cleanRoomId;
        socket.join(cleanRoomId);

        // Fetch or hydrate room
        const room = await roomManager.getOrCreateRoom(cleanRoomId, canonicalUserId);
        
        // Create domain user
        const existingUser = room.getParticipant(canonicalUserId);
        let user: User;
        if (existingUser) {
          existingUser.updateSocketId(socket.id);
          existingUser.username = cleanUsername;
          user = existingUser;
        } else {
          const isFirstUser = room.getParticipants().length === 0;
          const role = isFirstUser ? UserRole.HOST : UserRole.PARTICIPANT;
          user = new User(canonicalUserId, cleanUsername, role, socket.id);
          room.addParticipant(user);
        }

        console.log(`👤 User '${cleanUsername}' (${user.role}) joined room [${cleanRoomId}]`);

        // Send full Room Snapshot to newly joined user
        socket.emit('room_snapshot', {
          room: room.toDTO(),
          chatHistory: room.getChatHistory()
        });

        // Broadcast user_joined event to everyone else in the room
        socket.to(cleanRoomId).emit('user_joined', {
          username: user.username,
          userId: user.userId,
          role: user.role,
          participants: room.getParticipants().map(u => u.toDTO())
        });

        // Send System Message to Chat
        const systemMsg: ChatMessageDTO = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          roomId: cleanRoomId,
          userId: 'system',
          username: 'System',
          role: UserRole.HOST,
          text: `🎉 ${user.username} joined the party as ${user.role}!`,
          timestamp: Date.now(),
          isSystem: true
        };
        room.addChatMessage(systemMsg);
        io.to(cleanRoomId).emit('chat_message', systemMsg);

      } catch (error) {
        console.error('Error handling join_room:', error);
        socket.emit('error_message', { code: 'JOIN_ERROR', message: 'Failed to join room' });
      }
    });

    // Helper to get active user & room
    const getActiveContext = () => {
      const roomId = socket.data.roomId;
      if (!roomId) return null;
      const room = roomManager.getRoom(roomId);
      if (!room) return null;
      const user = room.getParticipant(socket.data.userId);
      if (!user) return null;
      return { roomId, room, user };
    };

    // --- EVENT: play ---
    socket.on('play', ({ currentTime }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canControlPlayback(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host or Moderator can control playback.'
        });
      }

      room.updatePlayback(undefined, currentTime, true);
      io.to(roomId).emit('sync_state', room.getPlaybackState().toDTO());
    });

    // --- EVENT: pause ---
    socket.on('pause', ({ currentTime }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canControlPlayback(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host or Moderator can control playback.'
        });
      }

      room.updatePlayback(undefined, currentTime, false);
      io.to(roomId).emit('sync_state', room.getPlaybackState().toDTO());
    });

    // --- EVENT: seek ---
    socket.on('seek', ({ time }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canControlPlayback(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host or Moderator can seek.'
        });
      }

      room.updatePlayback(undefined, time, undefined);
      io.to(roomId).emit('sync_state', room.getPlaybackState().toDTO());
    });

    // --- EVENT: change_video ---
    socket.on('change_video', ({ videoId }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canChangeVideo(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host or Moderator can change videos.'
        });
      }

      const cleanVideoId = videoId.trim();
      room.updatePlayback(cleanVideoId, 0, true);
      io.to(roomId).emit('sync_state', room.getPlaybackState().toDTO());

      // System chat broadcast
      const sysMsg: ChatMessageDTO = {
        id: `sys_${Date.now()}`,
        roomId,
        userId: 'system',
        username: 'System',
        role: UserRole.HOST,
        text: `🎵 ${user.username} changed the video!`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.addChatMessage(sysMsg);
      io.to(roomId).emit('chat_message', sysMsg);
    });

    // --- EVENT: assign_role ---
    socket.on('assign_role', ({ targetUserId, role }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canAssignRole(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host can assign roles.'
        });
      }

      const targetUser = room.getParticipant(targetUserId);
      if (!targetUser) return;

      const success = room.assignRole(targetUserId, role);
      if (success) {
        io.to(roomId).emit('role_assigned', {
          targetUserId,
          username: targetUser.username,
          role: targetUser.role,
          participants: room.getParticipants().map(u => u.toDTO())
        });

        // System message
        const sysMsg: ChatMessageDTO = {
          id: `sys_${Date.now()}`,
          roomId,
          userId: 'system',
          username: 'System',
          role: UserRole.HOST,
          text: `🛡️ ${targetUser.username}'s role was updated to ${role}`,
          timestamp: Date.now(),
          isSystem: true
        };
        room.addChatMessage(sysMsg);
        io.to(roomId).emit('chat_message', sysMsg);
      }
    });

    // --- EVENT: remove_participant (Kick) ---
    socket.on('remove_participant', ({ targetUserId }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canKickUser(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host can remove participants.'
        });
      }

      const removedUser = room.removeParticipant(targetUserId);
      if (removedUser) {
        // Disconnect socket if still active
        const targetSocket = io.sockets.sockets.get(removedUser.socketId);
        if (targetSocket) {
          targetSocket.emit('error_message', { code: 'KICKED', message: 'You have been removed from the room by the host.' });
          targetSocket.leave(roomId);
        }

        io.to(roomId).emit('participant_removed', {
          targetUserId,
          participants: room.getParticipants().map(u => u.toDTO())
        });

        const sysMsg: ChatMessageDTO = {
          id: `sys_${Date.now()}`,
          roomId,
          userId: 'system',
          username: 'System',
          role: UserRole.HOST,
          text: `🚪 ${removedUser.username} was removed from the party by host.`,
          timestamp: Date.now(),
          isSystem: true
        };
        room.addChatMessage(sysMsg);
        io.to(roomId).emit('chat_message', sysMsg);
      }
    });

    // --- EVENT: transfer_host ---
    socket.on('transfer_host', ({ targetUserId }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      if (!PermissionGuard.canTransferHost(user.role)) {
        return socket.emit('error_message', {
          code: 'FORBIDDEN',
          message: 'Permission denied: Only Host can transfer host status.'
        });
      }

      const targetUser = room.getParticipant(targetUserId);
      if (!targetUser) return;

      const success = room.transferHost(targetUserId);
      if (success) {
        io.to(roomId).emit('host_transferred', {
          newHostId: targetUser.userId,
          newHostName: targetUser.username,
          participants: room.getParticipants().map(u => u.toDTO())
        });

        const sysMsg: ChatMessageDTO = {
          id: `sys_${Date.now()}`,
          roomId,
          userId: 'system',
          username: 'System',
          role: UserRole.HOST,
          text: `👑 Host transferred to ${targetUser.username}!`,
          timestamp: Date.now(),
          isSystem: true
        };
        room.addChatMessage(sysMsg);
        io.to(roomId).emit('chat_message', sysMsg);
      }
    });

    // --- EVENT: send_message ---
    socket.on('send_message', ({ text }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, room, user } = ctx;

      const cleanText = text.trim();
      if (!cleanText) return;

      const msg: ChatMessageDTO = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        roomId,
        userId: user.userId,
        username: user.username,
        role: user.role,
        text: cleanText,
        timestamp: Date.now()
      };

      room.addChatMessage(msg);
      io.to(roomId).emit('chat_message', msg);
    });

    // --- EVENT: send_reaction ---
    socket.on('send_reaction', ({ emoji }) => {
      const ctx = getActiveContext();
      if (!ctx) return;
      const { roomId, user } = ctx;

      const reaction: ReactionDTO = {
        id: `react_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        roomId,
        userId: user.userId,
        username: user.username,
        emoji: emoji || '🔥',
        timestamp: Date.now()
      };

      io.to(roomId).emit('reaction_event', reaction);
    });

    // --- EVENT: leave_room / disconnect ---
    const handleLeave = () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        const removedUser = room.removeParticipant(socket.data.userId);
        if (removedUser) {
          console.log(`👋 User '${removedUser.username}' left room [${roomId}]`);
          socket.leave(roomId);

          io.to(roomId).emit('user_left', {
            username: removedUser.username,
            userId: removedUser.userId,
            participants: room.getParticipants().map(u => u.toDTO())
          });

          // Check if host auto-changed
          const newHostId = room.getHostUserId();
          const newHostUser = room.getParticipant(newHostId);
          if (newHostUser && removedUser.isHost()) {
            io.to(roomId).emit('host_transferred', {
              newHostId: newHostUser.userId,
              newHostName: newHostUser.username,
              participants: room.getParticipants().map(u => u.toDTO())
            });
          }

          roomManager.removeRoomIfEmpty(roomId);
        }
      }
      socket.data.roomId = null;
    };

    socket.on('leave_room', handleLeave);
    socket.on('disconnect', () => {
      handleLeave();
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
