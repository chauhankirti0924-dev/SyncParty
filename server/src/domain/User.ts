import { UserRole, UserDTO } from '../types/events';

export class User {
  public readonly userId: string;
  public username: string;
  public role: UserRole;
  public socketId: string;
  public readonly joinedAt: number;

  constructor(userId: string, username: string, role: UserRole, socketId: string) {
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.socketId = socketId;
    this.joinedAt = Date.now();
  }

  public setRole(role: UserRole): void {
    this.role = role;
  }

  public updateSocketId(socketId: string): void {
    this.socketId = socketId;
  }

  public isHost(): boolean {
    return this.role === UserRole.HOST;
  }

  public isModerator(): boolean {
    return this.role === UserRole.MODERATOR;
  }

  public toDTO(): UserDTO {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt
    };
  }
}
