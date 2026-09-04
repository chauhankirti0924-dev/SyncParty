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

// Client -> Server Events
export interface ClientToServerEvents {
  join_room: (payload: { roomId: string; username: string; userId?: string }) => void;
  leave_room: (payload: { roomId: string }) => void;
  play: (payload: { currentTime?: number }) => void;
  pause: (payload: { currentTime?: number }) => void;
  seek: (payload: { time: number }) => void;
  change_video: (payload: { videoId: string }) => void;
  assign_role: (payload: { targetUserId: string; role: UserRole }) => void;
  remove_participant: (payload: { targetUserId: string }) => void;
  transfer_host: (payload: { targetUserId: string }) => void;
  send_message: (payload: { text: string }) => void;
  send_reaction: (payload: { emoji: string }) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  sync_state: (payload: PlaybackStateDTO) => void;
  user_joined: (payload: { username: string; userId: string; role: UserRole; participants: UserDTO[] }) => void;
  user_left: (payload: { username: string; userId: string; participants: UserDTO[] }) => void;
  role_assigned: (payload: { targetUserId: string; username: string; role: UserRole; participants: UserDTO[] }) => void;
  participant_removed: (payload: { targetUserId: string; participants: UserDTO[] }) => void;
  host_transferred: (payload: { newHostId: string; newHostName: string; participants: UserDTO[] }) => void;
  chat_message: (payload: ChatMessageDTO) => void;
  chat_history: (payload: ChatMessageDTO[]) => void;
  reaction_event: (payload: ReactionDTO) => void;
  error_message: (payload: { code: string; message: string }) => void;
  room_snapshot: (payload: { room: RoomDTO; chatHistory: ChatMessageDTO[] }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  roomId: string | null;
}
