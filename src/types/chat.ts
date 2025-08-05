// Chat-related types for the Teachers application

export interface ChatRoom {
  _id: string;
  id?: string;
  name?: string;
  type: ChatRoomType;
  classId?: string;
  courseId?: string;
  termId?: string;
  participants: string[];
  createdBy: string;
  lastMessage?: ChatMessage;
  lastMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  id?: string;
  roomId: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType: MessageType;
  replyTo?: string;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export enum ChatRoomType {
  ONE_TO_ONE = "one_to_one",
  CLASS_GROUP = "class_group",
  COURSE_GROUP = "course_group",
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
  VOICE = "voice",
}

export interface CreateChatRoomPayload {
  type: ChatRoomType;
  classId?: string;
  courseId?: string;
  termId?: string;
  participants: string[];
  name?: string;
}

export interface SendMessagePayload {
  content: string;
  messageType?: MessageType;
  replyTo?: string;
}

export interface ChatNotification {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}
