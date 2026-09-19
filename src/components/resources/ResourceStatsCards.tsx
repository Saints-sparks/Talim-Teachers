import React from "react";
import { FileText, FolderOpen, Upload, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ResourceStats } from "@/hooks/resources/stats";

/** One stat card. */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-0 shadow-none bg-white border border-[#F0F0F0]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-[#6F6F6F] truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-[#030E18]">{value}</p>
            <p className="text-xs text-[#878787] mt-1 truncate">{hint}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F0F0F0] rounded-lg flex items-center justify-center ml-2">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#6F6F6F]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The three figures above the resource list: total uploads, this week, and
 * how many of the teacher's classes have a resource.
 *
 * @param props - Card props.
 * @param props.stats - The figures, from `computeResourceStats`.
 * @returns The cards element.
 */
export function ResourceStatsCards({ stats }: { stats: ResourceStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6" data-guide="resources-stats">
      <StatCard label="Total Resources" value={stats.totalResources} hint="All time uploads" icon={FileText} />
      <StatCard
        label="This Week"
        value={stats.thisWeekResources}
        hint={stats.recentResources > 0 ? `${stats.recentResources} in last 3 days` : "Recent activity"}
        icon={Upload}
      />
      <StatCard
        label="Classes Covered"
        value={stats.uniqueClasses}
        hint={stats.totalAssignedClasses > 0 ? `out of ${stats.totalAssignedClasses} assigned` : "Active classes"}
        icon={FolderOpen}
      />
    </div>
  );
}
