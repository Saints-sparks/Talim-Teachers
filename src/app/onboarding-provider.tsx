"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { TeacherOnboardingProvider } from "@/app/context/OnboardingContext";
import { useAppContext } from "@/app/context/AppContext";
import { useOnboardingSync } from "@/app/hooks/useOnboardingSync";

const SYNC_THROTTLE_MS = 60_000;

function OnboardingSyncEffect() {
  const pathname = usePathname();
  const { user } = useAppContext();
  const { syncProgress } = useOnboardingSync();
  const lastSyncAt = useRef(0);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSyncAt.current < SYNC_THROTTLE_MS) return;
    lastSyncAt.current = now;
    syncProgress().catch(() => {});
  }, [pathname, user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function OnboardingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAppContext();
  const userId = user?.userId || user?._id || user?.id || null;

  return (
    <TeacherOnboardingProvider userId={userId}>
      <OnboardingSyncEffect />
      {children}
    </TeacherOnboardingProvider>
  );
}
