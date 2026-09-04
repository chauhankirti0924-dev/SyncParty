import { User } from './User';
import { PlaybackState } from './PlaybackState';
import { UserRole, RoomDTO, ChatMessageDTO } from '../types/events';
import { RoomModel } from '../models/RoomModel';
import { ChatMessageModel } from '../models/ChatMessageModel';

export class Room {
  public readonly roomId: string;
  public title: string;
  private participants: Map<string, User> = new Map();
  private playbackState: PlaybackState;
  private hostUserId: string;
  private chatHistory: ChatMessageDTO[] = [];
  private lastPersistenceTime: number = 0;
  private lastSeekTime: number = 0;

  constructor(roomId: string, hostUserId: string, title: string = 'Watch Party Room', initialVideoId: string = 'dQw4w9WgXcQ') {
    this.roomId = roomId;
    this.hostUserId = hostUserId;
    this.title = title;
    this.playbackState = new PlaybackState(initialVideoId, 0, false, 1);
  }

  public getHostUserId(): string {
    return this.hostUserId;
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  public getParticipants(): User[] {
    return Array.from(this.participants.values());
  }

  public getParticipant(userId: string): User | undefined {
    return this.participants.get(userId);
  }

  public addParticipant(user: User): void {
    // If this is the designated host or room is empty, assign HOST role
    if (user.userId === this.hostUserId || this.participants.size === 0) {
      user.setRole(UserRole.HOST);
      this.hostUserId = user.userId;
    } else {
      user.setRole(UserRole.PARTICIPANT);
    }
    this.participants.set(user.userId, user);
    this.schedulePersistence();
  }

  public removeParticipant(userId: string): User | undefined {
    const user = this.participants.get(userId);
    if (!user) return undefined;

    this.participants.delete(userId);

    // If host left and participants remain, auto-promote next oldest participant to HOST
    if (userId === this.hostUserId && this.participants.size > 0) {
      const remainingUsers = this.getParticipants().sort((a, b) => a.joinedAt - b.joinedAt);
      const newHost = remainingUsers[0];
      newHost.setRole(UserRole.HOST);
      this.hostUserId = newHost.userId;
    }

    this.schedulePersistence();
    return user;
  }

  public assignRole(targetUserId: string, newRole: UserRole): boolean {
    const user = this.participants.get(targetUserId);
    if (!user) return false;

    if (newRole === UserRole.HOST) {
      // Demote current host to Moderator/Participant and assign new Host
      const currentHost = this.participants.get(this.hostUserId);
      if (currentHost) {
        currentHost.setRole(UserRole.MODERATOR);
      }
      this.hostUserId = targetUserId;
    }

    user.setRole(newRole);
    this.schedulePersistence();
    return true;
  }

  public transferHost(newHostUserId: string): boolean {
    return this.assignRole(newHostUserId, UserRole.HOST);
  }

  public updatePlayback(videoId?: string, currentTime?: number, isPlaying?: boolean): void {
    // Rate limit rapid seek spam (< 100ms)
    if (currentTime !== undefined) {
      const now = Date.now();
      if (now - this.lastSeekTime < 100) {
        return;
      }
      this.lastSeekTime = now;
    }

    this.playbackState.updateState(videoId, currentTime, isPlaying);
    this.schedulePersistence();
  }

  public addChatMessage(message: ChatMessageDTO): void {
    this.chatHistory.push(message);
    // Keep max 100 messages in memory buffer for fast join snapshot
    if (this.chatHistory.length > 100) {
      this.chatHistory.shift();
    }

    // Async save to MongoDB
    ChatMessageModel.create({
      messageId: message.id,
      roomId: this.roomId,
      userId: message.userId,
      username: message.username,
      role: message.role,
      text: message.text,
      timestamp: message.timestamp,
      isSystem: message.isSystem || false
    }).catch(err => console.error(`Error persisting chat message for room ${this.roomId}:`, err));
  }

  public getChatHistory(): ChatMessageDTO[] {
    return this.chatHistory;
  }

  public setChatHistory(history: ChatMessageDTO[]): void {
    this.chatHistory = history;
  }

  public toDTO(): RoomDTO {
    return {
      roomId: this.roomId,
      title: this.title,
      playbackState: this.playbackState.toDTO(),
      participants: this.getParticipants().map(u => u.toDTO()),
      createdAt: Date.now()
    };
  }

  /**
   * Asynchronously persists room state snapshot to MongoDB (throttled to max 1 write / 2 sec per room)
   */
  private schedulePersistence(): void {
    const now = Date.now();
    if (now - this.lastPersistenceTime < 2000) {
      return;
    }
    this.lastPersistenceTime = now;

    RoomModel.findOneAndUpdate(
      { roomId: this.roomId },
      {
        roomId: this.roomId,
        title: this.title,
        currentVideoId: this.playbackState.getVideoId(),
        currentTime: this.playbackState.getCalculatedCurrentTime(),
        isPlaying: this.playbackState.getIsPlaying(),
        lastUpdated: Date.now(),
        hostUserId: this.hostUserId,
        participants: this.getParticipants().map(u => u.toDTO())
      },
      { upsert: true, new: true }
    ).catch(err => console.error(`Failed to persist room ${this.roomId} to MongoDB:`, err));
  }
}
