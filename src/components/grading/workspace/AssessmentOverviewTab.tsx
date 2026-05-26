import React from "react";

interface OverviewRow {
  courseName: string;
  teacherName: string;
  requiredAssessments: number;
  completedAssessments: number;
  missingGrades: number;
  status: string;
}

export const AssessmentOverviewTab: React.FC<{ rows: OverviewRow[] }> = ({ rows }) => {
  return (
    <div className="overflow-auto rounded-xl border border-[#D7E1ED] bg-white dark:border-slate-700 dark:bg-slate-800">
      <table className="w-full text-sm" aria-label="Assessment overview table">
        <thead className="bg-[#EBF0F7] text-left dark:bg-slate-700">
          <tr>
            <th className="p-3">Course</th>
            <th className="p-3">Teacher</th>
            <th className="p-3">Assessments required</th>
            <th className="p-3">Assessments completed</th>
            <th className="p-3">Missing grades</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.courseName}-${idx}`} className="border-t border-[#E4EAF2] dark:border-slate-700">
              <td className="p-3">{row.courseName}</td>
              <td className="p-3">{row.teacherName}</td>
              <td className="p-3">{row.requiredAssessments}</td>
              <td className="p-3">{row.completedAssessments}</td>
              <td className="p-3">{row.missingGrades}</td>
              <td className="p-3">{row.status}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={6}>No assessments have been created for this course and term.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};
