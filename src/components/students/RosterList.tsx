import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  isStudentActive,
  studentFullName,
  type StudentRecord,
} from "@/app/services/students/students.service";
import { StatusPill, StudentAvatar } from "./StudentAvatar";

const headCell = "text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 dark:text-slate-400";
const bodyCell = "px-4 py-3 text-sm text-gray-600 dark:text-slate-300";

/**
 * The roster as a table (desktop) and a tappable list (phones), inside a
 * card that scrolls sideways on its own if it must.
 *
 * @param props - Component props.
 * @param props.students - The students to show.
 * @param props.search - The active search text, echoed in the count line.
 * @returns The roster.
 */
export function RosterList({ students, search }: { students: StudentRecord[]; search: string }) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 overflow-hidden dark:bg-[#0F172A] dark:border-[#263A5C]"
      data-guide="students-roster"
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between dark:border-[#263A5C]">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          {students.length} {students.length === 1 ? "student" : "students"}
          {search && ` matching "${search}"`}
        </p>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 dark:bg-[#111C31] dark:border-[#263A5C]">
              <th className={headCell}>Student</th>
              <th className={headCell}>Email</th>
              <th className={headCell}>Admission No.</th>
              <th className={headCell}>Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#1B2B45]">
            {students.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50/60 transition-colors group dark:hover:bg-[#111C31]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar student={student} />
                    <span className="font-medium text-gray-900 text-sm dark:text-slate-100">
                      {studentFullName(student) || "—"}
                    </span>
                  </div>
                </td>
                <td className={bodyCell}>{student.userId?.email || "—"}</td>
                <td className={bodyCell}>{student.admissionNumber || "—"}</td>
                <td className="px-4 py-3">
                  <StatusPill active={isStudentActive(student)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/students/${student._id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#003366] hover:text-[#002244] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity dark:text-blue-300"
                  >
                    View profile
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100 dark:divide-[#1B2B45]">
        {students.map((student) => (
          <Link
            key={student._id}
            href={`/students/${student._id}`}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors dark:hover:bg-[#111C31]"
          >
            <StudentAvatar student={student} size="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate dark:text-slate-100">
                {studentFullName(student) || "—"}
              </p>
              <p className="text-xs text-gray-500 truncate mt-0.5 dark:text-slate-400">{student.userId?.email || "—"}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusPill active={isStudentActive(student)} />
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
