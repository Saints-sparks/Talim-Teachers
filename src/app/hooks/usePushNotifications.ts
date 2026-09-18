"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiClient } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/apiError";

const SW_PATH = "/sw.js";

/** Per user, so the next person on this browser doesn't inherit the flag. */
const storageKey = (userId: string) => `talim:push-subscribed:${userId}`;

function getCurrentUserId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.userId || user?._id || null;
  } catch {
    return null;
  }
}

const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Sync webPushEnabled to the backend NotificationPreference — best-effort, never
 * throws. Browsers have their own switch; pushEnabled controls phones.
 */
async function syncPushPreference(enabled: boolean): Promise<void> {
  try {
    await api.patch("/notifications/preferences", { webPushEnabled: enabled });
  } catch {
    // Non-fatal — subscription state is already persisted by the browser
  }
}

/**
 * Removes this browser's push subscription for the signed-in user. Call before
 * the auth cookies are cleared on sign-out. Best-effort, never throws.
 */
export async function unsubscribeWebPushOnLogout(): Promise<void> {
  const userId = getCurrentUserId();
  if (userId) localStorage.removeItem(storageKey(userId));
  localStorage.removeItem("talim:push-subscribed"); // old flag shared by every user
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return;
    await apiClient
      .request("/notifications/web-push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        keepalive: true,
      })
      .catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Signing out must never fail because of push cleanup.
  }
}

/** The browser's notification permission for this origin. */
export type PushPermission = "default" | "granted" | "denied";

/** What {@link usePushNotifications} returns. */
export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Manages this browser's web-push subscription for the signed-in teacher.
 *
 * @returns Whether push is supported and subscribed, plus subscribe/unsubscribe.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The toggle reflects the browser's real subscription, and only counts as on
  // for the user who turned it on.
  useEffect(() => {
    if (!pushSupported()) return;
    setIsSupported(true);
    setPermission(Notification.permission as PushPermission);

    let cancelled = false;
    const userId = getCurrentUserId();
    navigator.serviceWorker
      .getRegistration(SW_PATH)
      .then((reg) => reg?.pushManager.getSubscription())
      .then((subscription) => {
        if (cancelled) return;
        const flagged = userId ? localStorage.getItem(storageKey(userId)) === "true" : false;
        setIsSubscribed(Boolean(subscription) && flagged);
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getVapidKey = useCallback(async (): Promise<string> => {
    const { publicKey } = await api.get<{ publicKey: string }>("/notifications/web-push/vapid-public-key", {
      skipAuth: true,
    });
    if (!publicKey) throw new Error("Unable to load push configuration from server");
    return publicKey;
  }, []);

  const getOrRegisterSW = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) {
      reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
    }
    return reg;
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);

      if (permissionResult !== "granted") {
        throw new Error(
          permissionResult === "denied"
            ? "Notification permission was blocked. Please enable it in your browser settings."
            : "Notification permission was dismissed.",
        );
      }

      const [vapidKey, registration] = await Promise.all([
        getVapidKey(),
        getOrRegisterSW(),
      ]);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as Uint8Array<ArrayBuffer>,
      });

      const subJson = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await api.post("/notifications/web-push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      });

      const userId = getCurrentUserId();
      if (userId) localStorage.setItem(storageKey(userId), "true");
      setIsSubscribed(true);

      // Sync webPushEnabled=true to NotificationPreference
      await syncPushPreference(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to enable push notifications"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getVapidKey, getOrRegisterSW]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Sync webPushEnabled=false to NotificationPreference before removing subscription
      await syncPushPreference(false);

      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const subscription = await reg?.pushManager.getSubscription();

      if (subscription) {
        await apiClient.request("/notifications/web-push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      const userId = getCurrentUserId();
      if (userId) localStorage.removeItem(storageKey(userId));
      setIsSubscribed(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to disable push notifications"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
