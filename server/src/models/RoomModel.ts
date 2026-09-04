import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/events';

export interface IRoomParticipant {
  userId: string;
  username: string;
  role: UserRole;
  joinedAt: number;
}

export interface IRoom extends Document {
  roomId: string;
  title: string;
  currentVideoId: string;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  playbackRate: number;
  hostUserId: string;
  participants: IRoomParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IRoomParticipant>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.PARTICIPANT },
  joinedAt: { type: Number, default: () => Date.now() }
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Watch Party Room' },
  currentVideoId: { type: String, default: 'dQw4w9WgXcQ' },
  currentTime: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  lastUpdated: { type: Number, default: () => Date.now() },
  playbackRate: { type: Number, default: 1 },
  hostUserId: { type: String, required: true },
  participants: [ParticipantSchema]
}, { timestamps: true });

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
