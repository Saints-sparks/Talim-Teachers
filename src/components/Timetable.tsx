"use client";

import { Calendar } from "lucide-react";
import { ApiErrorState, EmptyState, LoadingState } from "@/components/states";
import { useTeacherTimetable } from "@/hooks/timetable/useTeacherTimetable";
import { useTimetableView } from "@/hooks/timetable/useTimetableView";
import { TimetableCards } from "@/components/timetable/TimetableCards";
import { TimetableFooter } from "@/components/timetable/TimetableFooter";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { TimetableHeader } from "@/components/timetable/TimetableHeader";

/**
 * The teacher's weekly timetable. The week is one cached query (a school admin
 * edits it rarely), shown as a day-by-slot table or, on phones, day cards.
 *
 * @returns The timetable screen.
 */
const Timetable: React.FC = () => {
  const timetable = useTeacherTimetable();
  const view = useTimetableView(timetable.data);
  const data = timetable.data;

  return (
    <div className="space-y-6 p-4 md:p-0">
      <TimetableHeader
        timeWindow={view.timeWindow}
        onWindow={view.setWindowKey}
        cardView={view.cardView}
        onToggleCardView={view.toggleCardView}
        refreshing={timetable.isFetching}
        onRefresh={() => void timetable.refetch()}
        canExport={Boolean(data) && view.totalLessons > 0}
        onExport={view.exportCsv}
      />

      {timetable.isPending ? (
        <LoadingState message="Loading your timetable…" />
      ) : timetable.isError && !data ? (
        <ApiErrorState
          error={timetable.error}
          fallback="Failed to load timetable. Please try again."
          onRetry={() => void timetable.refetch()}
        />
      ) : data && view.totalLessons === 0 ? (
        <EmptyState
          title="No Schedule Found"
          message="No classes are scheduled for you this week. Your school admin sets the timetable."
          icon={<Calendar className="h-6 w-6 text-gray-400 dark:text-slate-400" />}
          actionText="Refresh"
          onAction={() => void timetable.refetch()}
        />
      ) : data ? (
        <div className="bg-white rounded-xl border border-[#F0F0F0] overflow-hidden dark:bg-[#0F172A] dark:border-[#263A5C]">
          {view.cardView ? (
            <TimetableCards data={data} />
          ) : (
            <TimetableGrid data={data} slots={view.slots} showOtherTimes={view.timeWindow.key === "full"} />
          )}
          <TimetableFooter totalLessons={view.totalLessons} />
        </div>
      ) : null}
    </div>
  );
};

export default Timetable;
