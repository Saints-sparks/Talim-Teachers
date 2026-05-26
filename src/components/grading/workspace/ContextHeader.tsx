import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, Download } from "lucide-react";
import { RoleMode } from "./types";

interface ContextHeaderProps {
  role: RoleMode;
  termLabel: string;
  scopeLabel: string;
  onRefresh: () => void;
  onPrimary: () => void;
  onExport: () => void;
  primaryLabel: string;
  canBatchUpload: boolean;
  onBatchUpload?: () => void;
  loading?: boolean;
}

const Chip = ({ children, filled = false }: { children: React.ReactNode; filled?: boolean }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${filled ? "bg-[#003366] text-white" : "border border-[#D7E1ED] bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"}`}
  >
    {children}
  </span>
);

export const ContextHeader: React.FC<ContextHeaderProps> = ({
  role,
  termLabel,
  scopeLabel,
  onRefresh,
  onPrimary,
  onExport,
  primaryLabel,
  canBatchUpload,
  onBatchUpload,
  loading,
}) => {
  const roleLabel = role === "course" ? "Course Teacher" : "Class Teacher";

  return (
    <div className="rounded-xl border border-[#D7E1ED] bg-white p-4 md:p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] dark:text-slate-100">Grading Workspace</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Faster grading and class performance workflows.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip filled>{roleLabel}</Chip>
            <Chip>{termLabel || "Select term"}</Chip>
            <Chip>{scopeLabel || "Select scope"}</Chip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {canBatchUpload && (
            <Button variant="outline" onClick={onBatchUpload}>
              <Upload className="mr-2 h-4 w-4" /> Batch Upload
            </Button>
          )}
          <Button className="bg-[#003366] hover:bg-[#002B57]" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
