import { Room } from './Room';
import { RoomModel } from '../models/RoomModel';
import { ChatMessageModel } from '../models/ChatMessageModel';
import { ChatMessageDTO } from '../types/events';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Generates a collision-free 6-character uppercase alphanumeric room code.
   */
  public async generateUniqueRoomCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    while (attempts < 50) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!this.rooms.has(code)) {
        const existingDoc = await RoomModel.findOne({ roomId: code });
        if (!existingDoc) return code;
      }
      attempts++;
    }
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Get an existing in-memory room or hydrate from MongoDB if stored.
   */
  public async getOrCreateRoom(roomId: string, hostUserId: string, title?: string, initialVideoId?: string): Promise<Room> {
    const cleanRoomId = roomId.toUpperCase().trim();
    
    let room = this.rooms.get(cleanRoomId);
    if (room) {
      return room;
    }

    // Try finding room in MongoDB
    const roomDoc = await RoomModel.findOne({ roomId: cleanRoomId });
    if (roomDoc) {
      room = new Room(cleanRoomId, roomDoc.hostUserId, roomDoc.title, roomDoc.currentVideoId);
      room.updatePlayback(roomDoc.currentVideoId, roomDoc.currentTime, roomDoc.isPlaying);
      
      // Hydrate last 50 chat messages from MongoDB
      const chatDocs = await ChatMessageModel.find({ roomId: cleanRoomId })
        .sort({ timestamp: -1 })
        .limit(50);

      const chatHistory: ChatMessageDTO[] = chatDocs.map(c => ({
        id: c.messageId,
        roomId: c.roomId,
        userId: c.userId,
        username: c.username,
        role: c.role,
        text: c.text,
        timestamp: c.timestamp,
        isSystem: c.isSystem
      })).reverse();

      room.setChatHistory(chatHistory);
      this.rooms.set(cleanRoomId, room);
      return room;
    }

    // Create fresh room instance
    room = new Room(cleanRoomId, hostUserId, title || `Watch Room ${cleanRoomId}`, initialVideoId);
    this.rooms.set(cleanRoomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase().trim());
  }

  public getAllRoomsCount(): number {
    return this.rooms.size;
  }

  public removeRoomIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.getParticipants().length === 0) {
      console.log(`Cleaning up empty room from memory: ${roomId}`);
      this.rooms.delete(roomId);
    }
  }
}
