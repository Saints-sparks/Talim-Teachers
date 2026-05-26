import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { GradeRow } from "./types";
import { StatusBadge } from "./StatusBadge";

export const ClassPerformanceTable: React.FC<{
  rows: GradeRow[];
  onViewDetails: (row: GradeRow) => void;
}> = ({ rows, onViewDetails }) => {
  return (
    <div className="overflow-auto rounded-xl border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-sm" aria-label="Class performance table">
        <thead className="bg-[#EBF0F7] text-left dark:bg-slate-700">
          <tr>
            <th className="p-3">Student name</th>
            <th className="p-3">Average score</th>
            <th className="p-3">Grade preview</th>
            <th className="p-3">Position</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t border-[#E4EAF2] dark:border-slate-700">
              <td className="p-3">{row.studentName}</td>
              <td className="p-3">{typeof row.score === "number" ? `${row.score.toFixed(1)}%` : "-"}</td>
              <td className="p-3">{row.gradePreview || "-"}</td>
              <td className="p-3">{row.position || "-"}</td>
              <td className="p-3"><StatusBadge status={row.status} /></td>
              <td className="p-3">
                <Button variant="ghost" size="sm" onClick={() => onViewDetails(row)}>
                  <Eye className="mr-1 h-4 w-4" /> View Details
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="p-8 text-center text-slate-500" colSpan={6}>No students are enrolled in this class.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
