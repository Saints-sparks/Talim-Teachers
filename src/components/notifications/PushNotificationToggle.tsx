"use client";

import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { ToggleRow, ValueRow } from "@/components/settings/SettingsRows";
import { pill, pillTone } from "@/components/tl/styles";

/**
 * Settings → Notifications → "Browser notifications": this browser's web
 * push subscription, as a switch row. When the browser blocks notifications
 * it explains calmly what that means and how to undo it instead; when the
 * browser can't do push at all it says so.
 *
 * @returns The row.
 */
export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return <ValueRow label="Browser notifications" description="Not supported in this browser" value="Unavailable" />;
  }

  if (permission === "denied") {
    return (
      <div className="py-[15px]" role="status">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px] font-bold text-tl-ink">Browser notifications</p>
          <span className={`${pill} ${pillTone.muted}`}>Off in this browser</span>
        </div>
        <p className="mt-1 text-[13px] leading-[1.55] text-tl-muted">
          Your browser is set not to show Talim alerts, so you will not see pop-up notifications while Talim is closed or in the
          background. Notifications inside Talim keep working as usual.
        </p>
        <p className="mt-1 text-[13px] leading-[1.55] text-tl-muted">
          To turn them back on, open this site&apos;s settings from your browser&apos;s address bar (usually the icon beside the web
          address), set Notifications to Allow, and reload the page.
        </p>
      </div>
    );
  }

  /**
   * Subscribes or unsubscribes this browser; a failure is shown from the hook's `error`.
   *
   * @returns Resolves when the change is done.
   */
  const handleToggle = async () => {
    try {
      if (isSubscribed) await unsubscribe();
      else await subscribe();
    } catch {
      // The hook's `error` is shown under the row.
    }
  };

  return (
    <ToggleRow
      label="Browser notifications"
      description={isSubscribed ? "Showing Talim alerts in this browser, even when the tab is closed" : "Alerts in this browser, even when the tab is closed"}
      checked={isSubscribed}
      disabled={isLoading}
      onChange={() => void handleToggle()}
    >
      {error ? (
        <p className="-mt-2 pb-3 text-[13px] font-semibold text-tl-danger" role="alert">
          {error}
        </p>
      ) : null}
    </ToggleRow>
  );
}
