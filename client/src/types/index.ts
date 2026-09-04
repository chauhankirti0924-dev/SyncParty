export enum UserRole {
  HOST = 'Host',
  MODERATOR = 'Moderator',
  PARTICIPANT = 'Participant',
  VIEWER = 'Viewer'
}

export interface UserDTO {
  userId: string;
  username: string;
  role: UserRole;
  joinedAt: number;
}

export interface PlaybackStateDTO {
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  playbackRate?: number;
}

export interface RoomDTO {
  roomId: string;
  title: string;
  playbackState: PlaybackStateDTO;
  participants: UserDTO[];
  createdAt: number;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  role: UserRole;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ReactionDTO {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  emoji: string;
  timestamp: number;
}
