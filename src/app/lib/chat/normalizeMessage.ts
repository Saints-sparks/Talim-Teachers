/**
 * The one place that reads a chat message off the wire. It prefers the canonical
 * fields from docs/chat-realtime-contract.md (text, createdAt, senderId/sender._id,
 * attachment objects, type) and falls back to the deprecated aliases.
 */

export type MessageStatus = "sent" | "pending" | "failed";

export interface ChatAttachmentView {
  url: string;
  type: string;
  /** Audio only: an MP3 rendition to play when present. */
  playbackUrl?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
}

export interface ChatMessageView {
  /** Server id, or `local:<clientMessageId>` while a send is pending. */
  _id: string;
  roomId: string;
  clientMessageId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  text: string;
  type: string;
  attachments: ChatAttachmentView[];
  duration?: number;
  readBy: string[];
  createdAt: string;
  status: MessageStatus;
  error?: string;
  /** Pending media: upload progress per attachment, 0–1. */
  uploadProgress?: number[];
}

const idOf = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; userId?: unknown; id?: unknown };
    return idOf(obj._id ?? obj.userId ?? obj.id);
  }
  return String(value);
};

const nameOf = (value: any): string => {
  if (!value || typeof value !== "object") return "";
  const full = `${value.firstName || ""} ${value.lastName || ""}`.trim();
  return full || value.name || "";
};

const toIsoDate = (value: unknown): string => {
  const date = value ? new Date(value as string) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const toAttachment = (value: any): ChatAttachmentView | null => {
  if (!value) return null;
  if (typeof value === "string") return { url: value, type: "file" };
  if (typeof value.url !== "string") return null;
  return {
    url: value.url,
    type: value.type || "file",
    playbackUrl: typeof value.playbackUrl === "string" ? value.playbackUrl : undefined,
    name: value.name,
    mimeType: value.mimeType,
    size: value.size,
    duration: value.duration,
    width: value.width,
    height: value.height,
  };
};

export function normalizeMessage(raw: any): ChatMessageView | null {
  if (!raw || typeof raw !== "object") return null;
  const _id = idOf(raw._id ?? raw.id);
  if (!_id) return null;

  const senderId = idOf(raw.sender?._id) || idOf(raw.senderId);
  const senderName =
    raw.sender?.name || nameOf(raw.senderId) || raw.senderName || "Unknown";

  return {
    _id,
    roomId: idOf(raw.roomId ?? raw.chatRoomId),
    clientMessageId: raw.clientMessageId || undefined,
    senderId,
    senderName,
    senderAvatar: raw.sender?.avatar ?? raw.senderId?.userAvatar ?? null,
    text: typeof raw.text === "string" ? raw.text : raw.content || "",
    type: raw.type || "text",
    attachments: (Array.isArray(raw.attachments) ? raw.attachments : [])
      .map(toAttachment)
      .filter(Boolean) as ChatAttachmentView[],
    duration: typeof raw.duration === "number" ? raw.duration : undefined,
    readBy: (Array.isArray(raw.readBy) ? raw.readBy : []).map(idOf).filter(Boolean),
    createdAt: toIsoDate(raw.createdAt ?? raw.timestamp),
    status: "sent",
  };
}

export function normalizeMessages(raw: unknown): ChatMessageView[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMessage).filter(Boolean) as ChatMessageView[];
}

/** A send id the server accepts (≤ 64 chars) and can use to dedupe retries. */
export function createClientMessageId(): string {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}
