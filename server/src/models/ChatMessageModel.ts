import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/events';

export interface IChatMessage extends Document {
  messageId: string;
  roomId: string;
  userId: string;
  username: string;
  role: UserRole;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  messageId: { type: String, required: true, unique: true },
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  text: { type: String, required: true },
  timestamp: { type: Number, default: () => Date.now() },
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

ChatMessageSchema.index({ roomId: 1, timestamp: -1 });

export const ChatMessageModel = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
