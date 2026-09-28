"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { UploadModal } from "@/components/resources/uploadmodal";
import { useTour } from "@/components/tour/TourProvider";
import { card, pagePad, primaryButton } from "@/components/tl/styles";
import { TodayView } from "@/components/today/TodayView";
import { getErrorMessage } from "@/lib/apiError";
import { schoolClock } from "@/hooks/today/today.logic";
import { useSchoolNow, useTeacherToday } from "@/hooks/today/useTeacherToday";

/**
 * Grey blocks in the shape of Today while it loads.
 *
 * @returns The skeleton.
 */
export function TodaySkeleton() {
  const block = "animate-pulse rounded-[22px] bg-tl-line/70";
  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`} role="status" aria-label="Loading today">
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-tl-line/70" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-tl-line/70" />
      <div className="grid gap-[18px] min-[1180px]:grid-cols-2">
        <div className={`${block} h-[420px]`} />
        <div className="flex flex-col gap-[18px]">
          <div className={`${block} h-[210px]`} />
          <div className={`${block} h-[190px]`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Today, wired to its data: loading skeleton, an error with Try again, then
 * the view. Refetches on window focus, every five minutes, and as soon as
 * the school's date moves past the loaded day. Hosts the upload dialog the
 * page's actions open.
 *
 * @returns The screen.
 */
export function TodayScreen() {
  const query = useTeacherToday();
  const { user } = useAuth();
  const tour = useTour();
  const nowMs = useSchoolNow(query.data?.now, query.dataUpdatedAt);
  const [upload, setUpload] = useState<{ courseId?: string; week?: number } | null>(null);

  const data = query.data;
  const stale = data ? schoolClock(nowMs, data.timezone).date > data.date : false;
  const { refetch, isFetching } = query;
  // Once per loaded day: if the server still answers with yesterday, wait for the regular refetch.
  const refetchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!stale || !data || refetchedFor.current === data.date) return;
    refetchedFor.current = data.date;
    void refetch();
  }, [stale, data, refetch]);

  if (query.isPending) return <TodaySkeleton />;

  if (!data) {
    return (
      <div className={pagePad}>
        <div className={card} role="alert">
          <h1 className="text-[19px] font-extrabold text-tl-ink">We could not load your day</h1>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(query.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TodayView
        today={data}
        nowMs={nowMs}
        firstName={user?.firstName?.trim() || "there"}
        onUpload={(courseId, week) => setUpload({ courseId, week })}
        onTour={tour?.openTour}
      />
      <UploadModal isOpen={upload !== null} onClose={() => setUpload(null)} initialCourseId={upload?.courseId} initialWeek={upload?.week} />
    </>
  );
}
