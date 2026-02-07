"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Users, RefreshCw, Download, Search, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";
import LoadingCard from "../LoadingCard";
import StudentCard from "./StudentCard";
import SectionHeader from "@/components/ui/section-header";

interface ClassStudentsProps {
  selectedClass: any;
  students: any[];
  loadingStudents: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRetry: () => void;
  onBack: () => void;
}

const formatName = (student: any) => {
  return `${student?.userId?.firstName ?? ""} ${
    student?.userId?.lastName ?? ""
  }`.trim();
};

const ClassStudents: React.FC<ClassStudentsProps> = ({
  selectedClass,
  students = [],
  loadingStudents,
  error,
  searchQuery,
  setSearchQuery,
  onRetry,
  onBack,
}) => {
  // Local search state to provide snappy UI and debounced sync with parent
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  // Keep localSearch in sync when parent updates searchQuery externally
  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  // Debounce syncing localSearch -> parent setSearchQuery
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(localSearch || ""), 300);
    return () => clearTimeout(id);
  }, [localSearch, setSearchQuery]);

  const filteredStudents = useMemo(() => {
    const q = (localSearch || "").toLowerCase().trim();
    if (!q) return students;

    return students.filter((student) => {
      const fullName = formatName(student).toLowerCase();
      const admissionNo = (student?.admissionNumber || "").toLowerCase();
      const other = (student?.userId?.email || "").toLowerCase();
      return (
        fullName.includes(q) || admissionNo.includes(q) || other.includes(q)
      );
    });
  }, [students, localSearch]);

  const totalStudents = students.length;
  const capacity = selectedClass?.classCapacity ?? 0;
  const available = Math.max(capacity - totalStudents, 0);

  const handleExportCSV = useCallback(() => {
    if (!students || students.length === 0) return;
    const headers = ["Name", "Admission No", "Email", "Gender", "Class"];
    const rows = students.map((s) => [
      formatName(s),
      s?.admissionNumber || "",
      s?.userId?.email || "",
      s?.gender || "",
      selectedClass?.name || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedClass?.name || "class"}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [students, selectedClass]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`${selectedClass?.name || "Class"} Students`}
        subtitle={
          selectedClass?.classDescription ||
          "Manage and browse students in this class"
        }
        icon={<Users className="w-6 h-6 text-[#003366]" />}
        
        actions={
          <>
            <Button
              onClick={onBack}
              variant="ghost"
              className="border border-[#F0F0F0] hover:bg-[#F8FAFF]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              All Classes
            </Button>
            <Button
              onClick={onRetry}
              variant="outline"
              className="hidden sm:flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </>
        }
      />

      <div className="bg-white border border-[#F0F0F0] rounded-xl p-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1">
            <label className="sr-only">Search students</label>
            <div className="flex items-center border border-[#F0F0F0] rounded-lg bg-white px-3 py-2">
              <Search className="w-4 h-4 text-[#878787]" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by name, admission no or email"
                className="ml-3 w-full text-sm bg-transparent focus:outline-none"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="text-sm text-[#6F6F6F] ml-2"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLocalSearch("")}
              variant="ghost"
              className="border border-[#F0F0F0] hover:bg-[#F8FAFF]"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loadingStudents ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingCard key={i} height="h-48" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-[#878787] mb-4">
            <Users className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-semibold">Failed to Load Students</p>
            <p className="text-sm">{error}</p>
          </div>
          <div className="flex justify-center">
            <Button onClick={onRetry} className="bg-[#003366] text-white">
              Try Again
            </Button>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#F0F0F0] rounded-xl">
          <Users className="w-20 h-20 text-[#F0F0F0] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#030E18] mb-2">
            {localSearch ? "No Students Found" : "No Students in Class"}
          </h3>
          <p className="text-[#6F6F6F]">
            {localSearch
              ? `No students match "${localSearch}"`
              : `${
                  selectedClass?.name || "This class"
                } doesn't have any students yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student) => (
            <StudentCard key={student._id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassStudents;
