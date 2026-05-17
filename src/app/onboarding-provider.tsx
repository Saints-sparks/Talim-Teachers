"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { TeacherOnboardingProvider } from "@/app/context/OnboardingContext";
import { useAppContext } from "@/app/context/AppContext";
import { useOnboardingSync } from "@/app/hooks/useOnboardingSync";

const SYNC_THROTTLE_MS = 60_000;

function OnboardingSyncEffect() {
  const pathname = usePathname();
  const { user, classes } = useAppContext();
  const { syncProgress } = useOnboardingSync();
  const lastSyncAt = useRef(0);
  const lastSyncPath = useRef<string | null>(null);
  const classesLoadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const pathChanged = lastSyncPath.current !== pathname;
    if (!pathChanged && now - lastSyncAt.current < SYNC_THROTTLE_MS) return;

    lastSyncPath.current = pathname;
    lastSyncAt.current = now;
    syncProgress().catch(() => {});
  }, [pathname, user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run sync once when classes first populate so the attendance check
  // is not skipped due to a race between the initial sync and data loading.
  useEffect(() => {
    if (!user || !classes?.length || classesLoadedRef.current) return;
    classesLoadedRef.current = true;
    lastSyncAt.current = 0; // reset throttle so sync runs immediately
    syncProgress().catch(() => {});
  }, [classes, user, syncProgress]);

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
