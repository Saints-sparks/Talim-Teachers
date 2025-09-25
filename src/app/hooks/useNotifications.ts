import { useState, useEffect, use } from "react";
import axios from "axios";
import { API_BASE_URL } from "../lib/api/config";
import { useAuth } from "./useAuth";

const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, getAccessToken } = useAuth();
  const userId = user?.userId;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);

        // **Check localStorage first**
        const cachedNotifications = localStorage.getItem("notifications");
        if (cachedNotifications) {
          setNotifications(JSON.parse(cachedNotifications));
        }

        // **Fetch fresh notifications**
        const token = getAccessToken();
        if (!token) throw new Error("No authentication token found");
        const response = await axios.get(
          `${API_BASE_URL}/notifications/announcements/receiver/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.data || !Array.isArray(response.data.data)) {
          throw new Error("Unexpected response format");
        }

        const formattedNotifications = response.data.data.map((notif: any) => ({
          id: notif._id,
          title: notif.title || "No title",
          message: notif.message || "No message",
          senderId: notif.senderId || null,
          createdAt: notif.createdAt,
          unread: notif.readBy?.length === 0, // Assuming unread notifications have no readBy data
        }));

        // **Update state & cache**
        setNotifications(formattedNotifications);
        localStorage.setItem(
          "notifications",
          JSON.stringify(formattedNotifications)
        );
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
