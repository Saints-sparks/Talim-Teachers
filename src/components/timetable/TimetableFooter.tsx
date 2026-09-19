import { Calendar } from "lucide-react";

/**
 * The count of lessons this week and the grid legend.
 *
 * @param props - Component props.
 * @param props.totalLessons - Lessons in the week.
 * @returns The footer.
 */
export function TimetableFooter({ totalLessons }: { totalLessons: number }) {
  return (
    <div className="bg-gradient-to-r from-[#F0F0F0]/50 to-[#F0F0F0]/30 px-6 py-4 border-t-2 border-[#F0F0F0] dark:from-[#111C31] dark:to-[#111C31] dark:border-[#263A5C]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 text-[#030E18]">
          <div className="w-10 h-10 bg-[#003366] rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg text-[#003366] dark:text-blue-200">{totalLessons}</div>
            <div className="text-sm text-[#6F6F6F] dark:text-slate-400">classes scheduled this week</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#003366] to-[#004080] rounded" />
            <span className="text-sm font-medium text-[#030E18] dark:text-slate-200">Scheduled Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#F0F0F0] to-[#F0F0F0]/70 rounded border border-[#F0F0F0] dark:from-[#1B2B45] dark:to-[#111C31] dark:border-[#263A5C]" />
            <span className="text-sm font-medium text-[#030E18] dark:text-slate-200">Free Period</span>
          </div>
        </div>
      </div>
    </div>
  );
}
