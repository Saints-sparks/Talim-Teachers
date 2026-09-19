"use client";

import React, { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { TeacherClass } from "@/app/context/AppContext";
import {
  filterStudents,
  isStudentActive,
  rosterCsvRows,
  type StatusFilter,
  type StudentRecord,
} from "@/app/services/students/students.service";
import { csvFileName, downloadCsv, toCsv } from "@/app/services/grading-workspace/grade-csv";
import { ApiErrorState, EmptyState, LoadingState } from "@/components/states";
import { RosterHeader } from "./RosterHeader";
import { RosterList } from "./RosterList";
import { RosterStats } from "./RosterStats";
import { RosterToolbar } from "./RosterToolbar";

interface ClassStudentsProps {
  selectedClass: TeacherClass;
  students: StudentRecord[] | undefined;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  onRetry: () => void;
  onBack: () => void;
}

/**
 * One class's roster: counters, search and status filter, then a table (or
 * phone list) of students, with an empty state, an error state that keeps
 * the last roster on screen when only a refresh failed, and a CSV export.
 *
 * @param props - Component props.
 * @returns The roster screen.
 */
const ClassStudents: React.FC<ClassStudentsProps> = ({
  selectedClass,
  students,
  loading,
  refreshing,
  error,
  onRetry,
  onBack,
}) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const all = useMemo(() => students ?? [], [students]);
  const visible = useMemo(() => filterStudents(all, search, status), [all, search, status]);
  const activeCount = useMemo(() => all.filter(isStudentActive).length, [all]);

  const handleExport = () => {
    const { headers, rows } = rosterCsvRows(all);
    downloadCsv(csvFileName(selectedClass?.name || "class", "students"), toCsv(headers, rows));
  };

  return (
    <div className="space-y-5">
      <RosterHeader
        selectedClass={selectedClass}
        canExport={all.length > 0}
        refreshing={refreshing}
        onBack={onBack}
        onRefresh={onRetry}
        onExport={handleExport}
      />
      <RosterStats total={all.length} active={activeCount} capacity={selectedClass?.classCapacity} />
      <RosterToolbar search={search} status={status} onSearch={setSearch} onStatus={setStatus} />

      {loading ? (
        <LoadingState message="Loading students…" />
      ) : error && !students ? (
        <ApiErrorState error={error} fallback="Failed to load students. Please try again." onRetry={onRetry} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-[#003366] dark:text-blue-300" />}
          title={search || status !== "all" ? "No students found" : "No students enrolled"}
          message={
            search || status !== "all"
              ? "No students match your search or filter."
              : `${selectedClass?.name || "This class"} has no students yet.`
          }
          actionText={search || status !== "all" ? "Clear filters" : undefined}
          onAction={
            search || status !== "all"
              ? () => {
                  setSearch("");
                  setStatus("all");
                }
              : undefined
          }
        />
      ) : (
        <RosterList students={visible} search={search} />
      )}
    </div>
  );
};

export default ClassStudents;
