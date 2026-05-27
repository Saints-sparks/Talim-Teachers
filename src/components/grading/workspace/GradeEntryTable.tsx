import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye } from "lucide-react";
import { GradeRow } from "./types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  rows: GradeRow[];
  onChangeScore: (studentId: string, score: number) => void;
  onViewDetails: (row: GradeRow) => void;
  onMoveNext?: (studentId: string) => void;
  onSaveRow?: (studentId: string) => void;
  isRowDirty?: (studentId: string) => boolean;
  isSaving?: boolean;
  ariaLabel?: string;
}

export const GradeEntryTable: React.FC<Props> = ({ rows, onChangeScore, onViewDetails, onMoveNext, onSaveRow, isRowDirty, isSaving, ariaLabel }) => {
  return (
    <div className="overflow-auto rounded-xl border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-sm" aria-label={ariaLabel || "Grade entry table"}>
        <thead className="bg-[#EBF0F7] text-left dark:bg-slate-700">
          <tr>
            <th className="p-3">Student name</th>
            <th className="p-3">Score / max score</th>
            <th className="p-3">Status</th>
            <th className="p-3">Last updated</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t border-[#E4EAF2] dark:border-slate-700">
              <td className="p-3">{row.studentName}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Score for ${row.studentName}`}
                    type="number"
                    min={0}
                    max={row.maxScore}
                    className="w-24"
                    value={row.score ?? ""}
                    onChange={(e) => onChangeScore(row.studentId, Number(e.target.value || 0))}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === "Tab") && onMoveNext) {
                        onMoveNext(row.studentId);
                      }
                    }}
                  />
                  <span>/ {row.maxScore}</span>
                </div>
              </td>
              <td className="p-3"><StatusBadge status={row.status} /></td>
              <td className="p-3">{row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : "-"}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(row)}>
                    <Eye className="mr-1 h-4 w-4" /> View Details
                  </Button>
                  {onSaveRow && (
                    <Button
                      size="sm"
                      onClick={() => onSaveRow(row.studentId)}
                      disabled={isSaving || !isRowDirty?.(row.studentId)}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="p-8 text-center text-slate-500" colSpan={5}>No students are enrolled in this class.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
