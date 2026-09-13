"use client";

import { useCallback, useEffect, useState } from "react";
import nookies from "nookies";
import { API_BASE_URL } from "@/app/lib/api/config";

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

function getAccessToken(): string | null {
  try {
    const cookies = nookies.get(undefined);
    return cookies.access_token || null;
  } catch {
    return null;
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

/**
 * Sync webPushEnabled to the backend NotificationPreference — best-effort, never
 * throws. Browsers have their own switch; pushEnabled controls phones.
 */
async function syncPushPreference(enabled: boolean): Promise<void> {
  try {
    await authFetch(`${API_BASE_URL}/notifications/preferences`, {
      method: "PATCH",
      body: JSON.stringify({ webPushEnabled: enabled }),
    });
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
    await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      keepalive: true,
    }).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Signing out must never fail because of push cleanup.
  }
}

export type PushPermission = "default" | "granted" | "denied";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

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
    const res = await fetch(`${API_BASE_URL}/notifications/web-push/vapid-public-key`);
    if (!res.ok) throw new Error("Unable to load push configuration from server");
    const { publicKey } = await res.json();
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

      const res = await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
        method: "POST",
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to save push subscription on server");
      }

      const userId = getCurrentUserId();
      if (userId) localStorage.setItem(storageKey(userId), "true");
      setIsSubscribed(true);

      // Sync webPushEnabled=true to NotificationPreference
      await syncPushPreference(true);
    } catch (err: any) {
      setError(err.message || "Failed to enable push notifications");
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
        await authFetch(`${API_BASE_URL}/notifications/web-push/subscribe`, {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      const userId = getCurrentUserId();
      if (userId) localStorage.removeItem(storageKey(userId));
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || "Failed to disable push notifications");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
