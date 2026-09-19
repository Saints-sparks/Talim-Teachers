"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/apiError";
import { sessionStore } from "@/lib/session";
import {
  PUSH_STATE_EVENT,
  disableWebPush,
  enableWebPush,
  getCurrentSubscription,
  isPushSupported,
  pushFlagKey,
  type PushPermission,
} from "@/lib/webPushSync";

export type { PushPermission } from "@/lib/webPushSync";

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
 * Permission is only ever requested from `subscribe`, which the toggle calls
 * from a click. Keeping the backend in step with the browser is
 * `startWebPushSync`'s job (mounted once by `AuthProvider`).
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
  // for the user who turned it on. Re-read when reconcile changes something.
  useEffect(() => {
    if (!isPushSupported()) return;
    setIsSupported(true);

    let cancelled = false;
    const refresh = () => {
      setPermission(Notification.permission as PushPermission);
      const userId = sessionStore.getUserId();
      getCurrentSubscription()
        .then((subscription) => {
          if (cancelled) return;
          const flagged = userId ? localStorage.getItem(pushFlagKey(userId)) === "true" : false;
          setIsSubscribed(Boolean(subscription) && flagged && Notification.permission === "granted");
        })
        .catch(() => {
          if (!cancelled) setIsSubscribed(false);
        });
    };
    refresh();
    window.addEventListener(PUSH_STATE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_STATE_EVENT, refresh);
    };
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only ever called from the toggle's click handler.
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermission);

      if (permissionResult !== "granted") {
        throw new Error(
          permissionResult === "denied"
            ? "Notification permission was blocked. Please enable it in your browser settings."
            : "Notification permission was dismissed.",
        );
      }

      await enableWebPush(sessionStore.getUserId());
      setIsSubscribed(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to enable push notifications"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await disableWebPush(sessionStore.getUserId());
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
