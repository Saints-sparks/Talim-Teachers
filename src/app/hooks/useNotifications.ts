import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { apiClient } from "../lib/api/apiClient";

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

const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, getAccessToken, getUser } = useAuth();
  const userId = getUserId(user || getUser());

  useEffect(() => {
    const fetchNotifications = async () => {
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

        // **Check localStorage first**
        const cacheKey = `notifications:${userId}`;
        const cachedNotifications = localStorage.getItem(cacheKey);
        if (cachedNotifications) {
          setNotifications(JSON.parse(cachedNotifications));
        }

        // **Fetch fresh notifications**
        const response = await apiClient.get(
          `/notifications/announcements/receiver/${userId}`
        );

        const items = getNotificationItems(response.data);
        if (!response.data || !Array.isArray(items)) {
          throw new Error("Unexpected response format");
        }

        const formattedNotifications = items.map((notif: any) => ({
          id: notif._id,
          title: notif.title || "No title",
          message: notif.message || notif.content || "No message",
          senderId: notif.senderId || notif.createdBy || null,
          createdAt: notif.createdAt,
          unread: Array.isArray(notif.readBy)
            ? !notif.readBy.some((reader: any) => getUserId(reader) === userId)
            : false,
        }));

        // **Update state & cache**
        setNotifications(formattedNotifications);
        localStorage.setItem(cacheKey, JSON.stringify(formattedNotifications));
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setError("Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // **Optional: Refetch every 5 minutes**
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5);

    return () => clearInterval(interval); // Cleanup
  }, [userId]);

  return { notifications, loading, error };
};

export default useNotifications;
