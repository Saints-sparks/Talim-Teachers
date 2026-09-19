import { studentFullName, studentInitials, type StudentRecord } from "@/app/services/students/students.service";

/**
 * A student's photo, or their initials on the brand colour when there is none.
 *
 * @param props - Component props.
 * @param props.student - The record.
 * @param props.size - Tailwind size classes, e.g. `"w-9 h-9"`.
 * @returns The avatar.
 */
export function StudentAvatar({ student, size = "w-9 h-9" }: { student: StudentRecord; size?: string }) {
  const avatar = student.userId?.userAvatar;
  return avatar ? (
    <img
      src={avatar}
      alt={studentFullName(student)}
      className={`${size} rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0 dark:ring-[#263A5C]`}
    />
  ) : (
    <div
      className={`${size} rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}
    >
      {studentInitials(student)}
    </div>
  );
}

/**
 * The Active / Inactive pill.
 *
 * @param props - Component props.
 * @param props.active - Whether the student is active.
 * @returns The pill.
 */
export function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
