import React from "react";
import { Button } from "@/components/ui/button";
import { ScopedKpi } from "./types";

export const ScopedKpiCards: React.FC<{
  data: ScopedKpi[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}> = ({ data, loading, error, onRetry }) => {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        We couldn’t load this grading data. Check your connection and try again.
        {onRetry && (
          <Button variant="outline" className="ml-3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {data.map((kpi) => (
        <div key={kpi.id} className="rounded-xl border border-[#D7E1ED] bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#003366] dark:text-slate-100">{loading ? "..." : kpi.value}</p>
          {kpi.subValue && <p className="text-xs text-slate-500">{kpi.subValue}</p>}
          {typeof kpi.progress === "number" && (
            <div className="mt-3 h-2 rounded-full bg-[#EBF0F7] dark:bg-slate-700">
              <div className="h-2 rounded-full bg-[#003366]" style={{ width: `${Math.max(0, Math.min(100, kpi.progress))}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
