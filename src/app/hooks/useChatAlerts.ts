"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/components/CustomToast";
import { useWebSocketContextSafe } from "../context/WebSocketContext";
import type { ChatRoomActivityData, NotificationData } from "./useWebSocket";
import { CHAT_ROOM_REMOVED_EVENT, type ChatRoomRemovedDetail } from "./useRealtimeChat";

/** Fired on window for every in-app notification, so bell counts update live. */
export const NOTIFICATION_EVENT = "talim:notification";

/**
 * The messages page URL that opens a given room.
 *
 * @param roomId - The room to open.
 * @returns e.g. `/messages?room=abc`.
 */
export const messagesRoomUrl = (roomId: string) =>
  `/messages?room=${encodeURIComponent(roomId)}`;

const TITLE_PREFIX = /^\(\d+\+?\) /;

interface UseChatAlertsOptions {
  currentUserId: string | null;
  totalUnread: number;
  isRoomOpen: (roomId: string) => boolean;
}

/**
 * Mounted once, in the root chat provider. Tells the user about chat activity
 * anywhere in the app: a toast for messages in rooms they aren't reading, the
 * unread total in the tab title, in-app notifications, and clicks on browser
 * push notifications (relayed by public/sw.js).
 */
export function useChatAlerts({ currentUserId, totalUnread, isRoomOpen }: UseChatAlertsOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const webSocket = useWebSocketContextSafe();
  const onChatRoomActivity = webSocket?.onChatRoomActivity;
  const onNotification = webSocket?.onNotification;

  const pathnameRef = useRef(pathname);
  const currentUserIdRef = useRef(currentUserId);
  const isRoomOpenRef = useRef(isRoomOpen);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
    currentUserIdRef.current = currentUserId;
    isRoomOpenRef.current = isRoomOpen;
    routerRef.current = router;
  }, [pathname, currentUserId, isRoomOpen, router]);

  // New messages in rooms the user isn't looking at.
  useEffect(() => {
    if (!onChatRoomActivity) return;
    return onChatRoomActivity((data: ChatRoomActivityData) => {
      const lastMessage = data?.lastMessage;
      if (!data?.roomId || !lastMessage) return;
      if (lastMessage.senderId && lastMessage.senderId === currentUserIdRef.current) return;
      const viewingRoom =
        pathnameRef.current?.startsWith("/messages") && isRoomOpenRef.current(data.roomId);
      if (viewingRoom) return;

      const sender = lastMessage.senderName || "New message";
      const preview = lastMessage.preview || "Sent a message";
      toast.info(`${sender}: ${preview}`, {
        duration: 5000,
        onClick: () => routerRef.current.push(messagesRoomUrl(data.roomId)),
      });
    });
  }, [onChatRoomActivity]);

  // In-app notifications. Chat alerts come from chat-room-activity instead.
  useEffect(() => {
    if (!onNotification) return;
    return onNotification((notification: NotificationData) => {
      if (!notification) return;
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: notification }));
      if (notification.type === "chat_message") return;
      const body = notification.body || notification.message || "";
      toast.info(body || notification.title, {
        title: body ? notification.title : undefined,
        duration: 5000,
        onClick: () => routerRef.current.push("/notifications"),
      });
    });
  }, [onNotification]);

  // Removed from a group (or left it): say so, and leave the chat if it is on screen.
  useEffect(() => {
    const handleRemoved = (event: Event) => {
      const detail = (event as CustomEvent<ChatRoomRemovedDetail>).detail;
      if (!detail?.roomId) return;
      if (!detail.byMe) toast.warning(`You were removed from ${detail.name}`);
      const onMessages = pathnameRef.current?.startsWith("/messages");
      const openRoom = new URLSearchParams(window.location.search).get("room");
      if (onMessages && (openRoom === detail.roomId || detail.wasOpen)) {
        routerRef.current.replace("/messages");
      }
    };
    window.addEventListener(CHAT_ROOM_REMOVED_EVENT, handleRemoved);
    return () => window.removeEventListener(CHAT_ROOM_REMOVED_EVENT, handleRemoved);
  }, []);

  // "(3) Talim Teachers" while there are unread messages.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "");
      const next = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Next.js rewrites the title on navigation; put the count back when it does.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [totalUnread, pathname]);

  // Clicking a browser push while a tab is open: the service worker asks us to route.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || (data.type !== "OPEN_URL" && data.type !== "NOTIFICATION_CLICK")) return;
      if (typeof data.url !== "string") return;
      try {
        const target = new URL(data.url, window.location.origin);
        if (target.origin !== window.location.origin) return;
        routerRef.current.push(`${target.pathname}${target.search}${target.hash}`);
      } catch {
        // Ignore malformed urls.
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);
}
