"use client";

import { useMemo, useState } from "react";
import { GraduationCap, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import LoadingCard from "@/components/LoadingCard";
import ClassCard from "@/components/ClassCard";
import { useAppContext, type TeacherClass } from "@/app/context/AppContext";

/**
 * Class chooser for attendance. The classes come from the teacher record the
 * app already loaded at sign-in, so opening this page costs no request; the
 * Refresh button re-reads it on demand.
 *
 * @returns The page.
 */
const AttendancePage: React.FC = () => {
  const { classes, refreshClasses, isLoading } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filteredClasses = useMemo(
    () => classes.filter((c: TeacherClass) => String(c.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())),
    [classes, searchQuery],
  );

  const handleClassSelect = (classItem: { _id: string }) => {
    router.push(`/attendance/class/${classItem._id}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8] dark:bg-[#0F1629]">
        <div className="p-3 sm:p-6">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8"
            data-guide="attendance-header"
          >
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#030E18] truncate dark:text-slate-100">
                Attendance
              </h1>
              <p className="text-sm text-[#6F6F6F] mt-1 dark:text-slate-400">Select a class to manage attendance</p>
            </div>
            <div className="flex w-full md:w-auto" data-guide="attendance-search">
              <div className="flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full md:w-[320px] dark:bg-[#111C31] dark:border-[#263A5C]">
                <Search className="text-[#878787] mr-2" size={18} />
                <Input
                  className="border-0 focus-visible:ring-0 focus:outline-none flex-1 placeholder:text-[#878787] shadow-none text-sm"
                  placeholder="Search classes..."
                  aria-label="Search classes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          {isLoading ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              data-guide="attendance-class-grid"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <LoadingCard key={i} height="h-40 sm:h-48" />
              ))}
            </div>
          ) : filteredClasses.length > 0 ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              data-guide="attendance-class-grid"
            >
              {filteredClasses.map((c: TeacherClass) => (
                <ClassCard key={c._id} classItem={c} onView={handleClassSelect} />
              ))}
            </div>
          ) : (
            <div className="min-h-[420px] flex items-center justify-center">
              <div className="max-w-md text-center rounded-2xl border border-[#F0F0F0] bg-white p-8 dark:bg-[#0F172A] dark:border-[#263A5C]">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#EAF2FB] text-[#003366] dark:bg-[#10233E] dark:text-blue-200">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-semibold text-[#030E18] dark:text-slate-100">
                  {classes.length === 0 ? "No Classes Assigned" : "No Matching Classes"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F6F6F] dark:text-slate-400">
                  {classes.length === 0
                    ? "You do not have any assigned classes yet. Once your school admin assigns a class, it will appear here for attendance."
                    : "No assigned class matches your search. Try a different class name."}
                </p>
                <button
                  type="button"
                  onClick={() => void refreshClasses()}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#F0F0F0] bg-white px-4 py-2 text-sm font-semibold text-[#030E18] hover:bg-[#F8F8F8] dark:bg-[#111C31] dark:border-[#263A5C] dark:text-slate-100 dark:hover:bg-[#132742]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AttendancePage;
