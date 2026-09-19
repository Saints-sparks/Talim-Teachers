"use client";

import { useCallback, useMemo, useState } from "react";
import type { TimetableByDay } from "@/app/services/timetable/timetable.service";
import { csvFileName, downloadCsv, toCsv } from "@/app/services/grading-workspace/grade-csv";
import { toast } from "@/components/CustomToast";
import { logger } from "@/lib/logger";
import {
  TIME_WINDOWS,
  buildTimetableCsvRows,
  countEntries,
  slotsForWindow,
  type TimeWindow,
} from "@/hooks/timetable/timetable.logic";

/** What {@link useTimetableView} hands the timetable screen. */
export interface TimetableView {
  timeWindow: TimeWindow;
  setWindowKey: (key: string) => void;
  /** The slots the selected window shows. */
  slots: string[];
  /** Cards instead of the table (phones). */
  cardView: boolean;
  toggleCardView: () => void;
  totalLessons: number;
  /** Saves the visible slots as a CSV file. */
  exportCsv: () => void;
}

/**
 * View state for the timetable: the time window, table-or-cards, the lesson
 * count and the CSV export.
 *
 * @param data - The week grouped by day, once loaded.
 * @returns The state and actions the screen renders from.
 */
export function useTimetableView(data: TimetableByDay | undefined): TimetableView {
  const [windowKey, setWindowKey] = useState(TIME_WINDOWS[0].key);
  const [cardView, setCardView] = useState(false);

  const timeWindow = useMemo(() => TIME_WINDOWS.find((w) => w.key === windowKey) ?? TIME_WINDOWS[0], [windowKey]);
  const slots = useMemo(() => slotsForWindow(timeWindow), [timeWindow]);
  const totalLessons = useMemo(() => countEntries(data), [data]);

  const exportCsv = useCallback(() => {
    if (!data || totalLessons === 0) {
      toast.error("No timetable data to export");
      return;
    }
    try {
      const { headers, rows } = buildTimetableCsvRows(data, slots);
      downloadCsv(csvFileName("timetable", new Date().toISOString().slice(0, 10)), toCsv(headers, rows));
      toast.success("Timetable exported successfully!");
    } catch (error) {
      logger.error("timetable", "Export failed", error);
      toast.error("Failed to export timetable");
    }
  }, [data, slots, totalLessons]);

  return {
    timeWindow,
    setWindowKey,
    slots,
    cardView,
    toggleCardView: () => setCardView((v) => !v),
    totalLessons,
    exportCsv,
  };
}
