"use client";

import React, { useState } from "react";
import { UploadModal } from "@/components/resources/uploadmodal";
import { card, pagePad, primaryButton } from "@/components/tl/styles";
import { TimetableView, type TimetableMode } from "@/components/timetable/TimetableView";
import { toast } from "@/components/CustomToast";
import { csvFileName, downloadCsv, toCsv } from "@/app/services/grading-workspace/grade-csv";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { useTeacherPreferences } from "@/hooks/settings/useTeacherSettings";
import { weekCsvRows } from "@/hooks/timetable/timetableWeek.logic";
import { useSchoolNow, useTimetableWeek } from "@/hooks/today/useTeacherToday";

/**
 * The timetable wired to `GET /timetable/me`: loading and error states, week
 * navigation, the Week/Today default from the teacher's
 * `teaching.timetableDisplay` preference, print, CSV export and the upload
 * dialog the lesson sheet opens.
 *
 * @returns The screen.
 */
export function TimetableScreen() {
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const query = useTimetableWeek(weekStart);
  const nowMs = useSchoolNow(query.data?.now, query.dataUpdatedAt);
  const { preferences } = useTeacherPreferences();
  const [pickedMode, setPickedMode] = useState<TimetableMode | null>(null);
  const mode: TimetableMode = pickedMode ?? (preferences.teaching.timetableDisplay === "today" ? "today" : "week");
  const [upload, setUpload] = useState<{ courseId?: string; week?: number } | null>(null);

  if (query.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`} role="status" aria-label="Loading your timetable">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-tl-line/70" />
        <div className="h-[520px] animate-pulse rounded-[22px] bg-tl-line/70" />
      </div>
    );
  }

  const week = query.data;
  if (!week) {
    return (
      <div className={pagePad}>
        <div className={card} role="alert">
          <h1 className="text-[19px] font-extrabold text-tl-ink">We could not load your timetable</h1>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(query.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  const exportCsv = () => {
    try {
      const { headers, rows } = weekCsvRows(week);
      downloadCsv(csvFileName("timetable", week.week.start), toCsv(headers, rows));
      toast.success("Timetable exported.");
    } catch (error) {
      logger.error("timetable", "export failed", error);
      toast.error("Could not export the timetable.");
    }
  };

  return (
    <>
      {query.isError ? (
        <div className={`${pagePad} pb-0`}>
          <p role="alert" className="rounded-2xl border border-tl-line bg-tl-warning-bg px-4 py-3 text-sm font-bold text-tl-warning">
            Could not load that week: {getErrorMessage(query.error)}. Showing the last week loaded.
          </p>
        </div>
      ) : null}
      <TimetableView
        week={week}
        nowMs={nowMs}
        mode={mode}
        onMode={setPickedMode}
        onWeek={setWeekStart}
        loadingWeek={query.isPlaceholderData}
        onExportCsv={exportCsv}
        onPrint={() => window.print()}
        onShareResource={(courseId, week) => setUpload({ courseId, week })}
      />
      <UploadModal isOpen={upload !== null} onClose={() => setUpload(null)} initialCourseId={upload?.courseId} initialWeek={upload?.week} />
    </>
  );
}
