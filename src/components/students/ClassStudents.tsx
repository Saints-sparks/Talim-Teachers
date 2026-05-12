"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Users,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Hash,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

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

const formatName = (student: any) =>
  `${student?.userId?.firstName ?? ""} ${student?.userId?.lastName ?? ""}`.trim();

const getInitials = (student: any) => {
  const first = student?.userId?.firstName?.[0] ?? "";
  const last = student?.userId?.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
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
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => { setLocalSearch(searchQuery || ""); }, [searchQuery]);
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(localSearch || ""), 300);
    return () => clearTimeout(id);
  }, [localSearch, setSearchQuery]);

  const filteredStudents = useMemo(() => {
    const q = (localSearch || "").toLowerCase().trim();
    return students.filter((s) => {
      const nameMatch = !q || formatName(s).toLowerCase().includes(q) ||
        (s?.userId?.email || "").toLowerCase().includes(q) ||
        (s?.admissionNumber || "").toLowerCase().includes(q);
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && s.isActive !== false) ||
        (statusFilter === "inactive" && s.isActive === false);
      return nameMatch && statusMatch;
    });
  }, [students, localSearch, statusFilter]);

  const totalStudents = students.length;
  const capacity = selectedClass?.classCapacity ?? 0;
  const activeCount = students.filter((s) => s.isActive !== false).length;

  const handleExportCSV = useCallback(() => {
    if (!students.length) return;
    const headers = ["Name", "Email", "Admission No", "Gender", "Status"];
    const rows = students.map((s) => [
      formatName(s),
      s?.userId?.email || "",
      s?.admissionNumber || "",
      s?.gender || "",
      s?.isActive !== false ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedClass?.name || "class"}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [students, selectedClass]);

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-guide="students-list-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#003366] hover:border-[#003366]/30 transition-all"
            title="Back to classes"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#003366]">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {selectedClass?.name || "Class"} — Students
            </h1>
            {selectedClass?.classDescription && (
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedClass.classDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!students.length}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#003366]/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-[#003366]" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#003366]/10 flex items-center justify-center flex-shrink-0">
            <Hash className="w-4 h-4 text-[#003366]" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{capacity || "—"}</p>
            <p className="text-xs text-gray-500">Capacity</p>
          </div>
        </div>
      </div>

      {/* ── Search & filter bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col sm:flex-row gap-3" data-guide="students-search-filter">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by name, email or admission number..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Main content ── */}
      {loadingStudents ? (
        <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#003366]" />
          <p className="text-sm text-gray-500">Loading students…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Failed to load students</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <button
            onClick={onRetry}
            className="px-5 py-2 bg-[#003366] text-white text-sm font-medium rounded-lg hover:bg-[#002244] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#003366]/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#003366]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">
              {localSearch ? "No students found" : "No students enrolled"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {localSearch
                ? `No results for "${localSearch}"`
                : `${selectedClass?.name || "This class"} has no students yet.`}
            </p>
          </div>
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="text-sm text-[#003366] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-guide="students-roster">
          {/* Table header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {filteredStudents.length}{" "}
              {filteredStudents.length === 1 ? "student" : "students"}
              {localSearch && ` matching "${localSearch}"`}
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                    Student
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                    Admission No.
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                    Gender
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((student) => {
                  const isActive = student.isActive !== false;
                  return (
                    <tr
                      key={student._id}
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {student.userId?.userAvatar ? (
                            <img
                              src={student.userId.userAvatar}
                              alt={formatName(student)}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {getInitials(student)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-sm">
                            {formatName(student) || "—"}
                          </span>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.userId?.email || "—"}
                      </td>
                      {/* Admission No */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.admissionNumber || "—"}
                      </td>
                      {/* Gender */}
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {student.gender || "—"}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/students/${student._id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#003366] hover:text-[#002244] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredStudents.map((student) => {
              const isActive = student.isActive !== false;
              return (
                <Link
                  key={student._id}
                  href={`/students/${student._id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {student.userId?.userAvatar ? (
                    <img
                      src={student.userId.userAvatar}
                      alt={formatName(student)}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {getInitials(student)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {formatName(student) || "—"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {student.userId?.email || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassStudents;
