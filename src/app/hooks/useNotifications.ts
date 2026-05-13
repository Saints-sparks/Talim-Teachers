import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { apiClient } from "../lib/api/apiClient";

export type NotificationSource = "school" | "talim" | "system";

export type NotificationCategory =
  | "announcement"
  | "attendance"
  | "academics"
  | "grading"
  | "resources"
  | "messages"
  | "account"
  | "other";

export type TeacherNotification = {
  id: string;
  rawId: string;
  source: NotificationSource;
  sourceLabel: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  senderName: string;
  senderEmail?: string;
  attachments: string[];
  related: Array<{ label: string; href?: string }>;
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
  endpoint: "announcement" | "notification";
};

const getUserId = (user: any): string => {
  if (!user) return "";
  return user.userId || user._id || user.id || "";
};

const getNotificationItems = (payload: any): any[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.announcements)) return payload.announcements;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getPersonName = (person: any, fallback = "System Notification") => {
  if (!person) return fallback;
  if (typeof person === "string") return fallback;
  if (person.name) return person.name;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.email || fallback;
};

const hasReadByUser = (readBy: any, userId: string) => {
  if (!Array.isArray(readBy)) return false;
  return readBy.some((reader: any) => getUserId(reader) === userId);
};

const getTextBlob = (item: any) =>
  [
    item?.type,
    item?.title,
    item?.message,
    item?.content,
    item?.metadata?.category,
    item?.metadata?.module,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const inferCategory = (item: any, fallback: NotificationCategory) => {
  const explicit = String(
    item?.category || item?.type || item?.metadata?.category || item?.metadata?.module || "",
  ).toLowerCase();
  const text = `${explicit} ${getTextBlob(item)}`;

  if (text.includes("attendance") || text.includes("absence") || text.includes("absent") || text.includes("late")) {
    return "attendance";
  }
  if (text.includes("grade") || text.includes("grading") || text.includes("result") || text.includes("report")) {
    return "grading";
  }
  if (text.includes("assessment") || text.includes("assignment") || text.includes("curriculum") || text.includes("academic")) {
    return "academics";
  }
  if (text.includes("resource") || text.includes("material") || text.includes("pdf") || text.includes("e-library")) {
    return "resources";
  }
  if (text.includes("chat") || text.includes("message")) {
    return "messages";
  }
  if (text.includes("account") || text.includes("password") || text.includes("login") || text.includes("security")) {
    return "account";
  }
  if (text.includes("announcement")) {
    return "announcement";
  }

  return fallback;
};

const toAttachments = (item: any) => {
  const attachments = [
    ...(Array.isArray(item?.attachments) ? item.attachments : []),
    ...(item?.attachment ? [item.attachment] : []),
  ];
  return attachments.filter(Boolean);
};

const buildRelated = (item: any) => {
  const metadata = item?.metadata || {};
  const related: Array<{ label: string; href?: string }> = [];

  if (metadata.className) related.push({ label: metadata.className });
  if (metadata.courseName) related.push({ label: metadata.courseName });
  if (metadata.studentName) related.push({ label: metadata.studentName });
  if (metadata.resourceTitle) related.push({ label: metadata.resourceTitle, href: metadata.resourceUrl });
  if (metadata.href || metadata.url) {
    related.push({ label: "Open related item", href: metadata.href || metadata.url });
  }

  return related;
};

const normalizeAnnouncement = (item: any, userId: string): TeacherNotification => {
  const sender = item.senderId || item.createdBy;
  const createdAt = item.publishedAt || item.createdAt || item.scheduledFor || new Date().toISOString();

  return {
    id: `announcement:${item._id}`,
    rawId: item._id,
    source: "school",
    sourceLabel: "School Announcement",
    category: inferCategory(item, "announcement"),
    title: item.title || "School announcement",
    message: item.message || item.content || "No message provided.",
    createdAt,
    unread: !hasReadByUser(item.readBy, userId),
    senderName: item.senderName || getPersonName(sender, "School"),
    senderEmail: sender?.email,
    attachments: toAttachments(item),
    related: buildRelated(item),
    priority: item.priority,
    metadata: item.metadata,
    endpoint: "announcement",
  };
};

const normalizeSystemNotification = (item: any, userId: string): TeacherNotification => {
  const sender = item.senderId || item.sender || item.createdBy;
  const isRead =
    typeof item.isRead === "boolean"
      ? item.isRead
      : typeof item.read === "boolean"
        ? item.read
        : hasReadByUser(item.readBy, userId);
  const source = item.source || item.metadata?.source;
  const normalizedSource: NotificationSource =
    source === "school" ? "school" : source === "talim" ? "talim" : "system";

  return {
    id: `notification:${item._id}`,
    rawId: item._id,
    source: normalizedSource,
    sourceLabel: normalizedSource === "talim" ? "Talim Alert" : "System Notification",
    category: inferCategory(item, "other"),
    title: item.title || "Notification",
    message: item.message || item.body || item.content || "No message provided.",
    createdAt: item.createdAt || new Date().toISOString(),
    unread: !isRead,
    senderName: item.senderName || getPersonName(sender),
    senderEmail: sender?.email,
    attachments: toAttachments(item),
    related: buildRelated(item),
    priority: item.priority,
    metadata: item.metadata,
    endpoint: "notification",
  };
};

const sortByNewest = (items: TeacherNotification[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const useNotifications = () => {
  const [notifications, setNotifications] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, getAccessToken, getUser } = useAuth();
  const userId = getUserId(user || getUser());

  const cacheKey = userId ? `teacher-notifications:${userId}` : "";

  const fetchNotifications = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setNotifications([]);
      setError("You need to sign in to view notifications.");
      setLoading(false);
      return;
    }

    if (!userId) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cachedNotifications = cacheKey ? localStorage.getItem(cacheKey) : null;
      if (cachedNotifications) {
        setNotifications(JSON.parse(cachedNotifications));
      }

      const [announcementsResponse, notificationsResponse] = await Promise.allSettled([
        apiClient.get(`/notifications/announcements/receiver/${userId}`),
        apiClient.get("/notifications", { params: { recipientId: userId, limit: 50 } }),
      ]);

      const normalized: TeacherNotification[] = [];

      if (announcementsResponse.status === "fulfilled") {
        normalized.push(
          ...getNotificationItems(announcementsResponse.value.data).map((item) =>
            normalizeAnnouncement(item, userId),
          ),
        );
      }

      if (notificationsResponse.status === "fulfilled") {
        normalized.push(
          ...getNotificationItems(notificationsResponse.value.data).map((item) =>
            normalizeSystemNotification(item, userId),
          ),
        );
      }

      if (announcementsResponse.status === "rejected" && notificationsResponse.status === "rejected") {
        throw new Error("Failed to load notifications.");
      }

      const nextNotifications = sortByNewest(normalized);
      setNotifications(nextNotifications);
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(nextNotifications));
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, getAccessToken, userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const persistNotifications = useCallback(
    (nextNotifications: TeacherNotification[]) => {
      setNotifications(nextNotifications);
      if (cacheKey) {
        localStorage.setItem(cacheKey, JSON.stringify(nextNotifications));
      }
    },
    [cacheKey],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((notification) => notification.id === notificationId);
      if (!target || !target.unread || !userId) return;

      const nextNotifications = notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, unread: false } : notification,
      );
      persistNotifications(nextNotifications);

      try {
        if (target.endpoint === "announcement") {
          await apiClient.put(`/notifications/announcements/${target.rawId}/read`, { userId });
        } else {
          await apiClient.put(`/notifications/${target.rawId}/read`, { userId });
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [notifications, persistNotifications, userId],
  );

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((notification) => notification.unread);
    if (!unreadNotifications.length || !userId) return;

    persistNotifications(notifications.map((notification) => ({ ...notification, unread: false })));

    await Promise.allSettled(
      unreadNotifications.map((notification) =>
        notification.endpoint === "announcement"
          ? apiClient.put(`/notifications/announcements/${notification.rawId}/read`, { userId })
          : apiClient.put(`/notifications/${notification.rawId}/read`, { userId }),
      ),
    );
  }, [notifications, persistNotifications, userId]);

  const counts = useMemo(() => {
    return notifications.reduce(
      (acc, notification) => {
        acc.all += 1;
        if (notification.unread) acc.unread += 1;
        acc[notification.category] = (acc[notification.category] || 0) + 1;
        return acc;
      },
      {
        all: 0,
        unread: 0,
        announcement: 0,
        attendance: 0,
        academics: 0,
        grading: 0,
        resources: 0,
        messages: 0,
        account: 0,
        other: 0,
      } as Record<NotificationCategory | "all" | "unread", number>,
    );
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    counts,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
