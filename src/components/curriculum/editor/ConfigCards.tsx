import type { ReactNode } from "react";
import { AlertCircle, BookOpen, Calendar, CheckCircle, Clock } from "lucide-react";
import { courseLabel, type CardSize, type CourseOption, type TermOption } from "./types";

const iconClass = (size: CardSize) => (size === "sm" ? "w-4 h-4" : "w-5 h-5");

/**
 * A titled white card with a tinted icon, the frame the config cards share.
 *
 * @param props - Frame props.
 * @param props.icon - The icon shown in the tinted square.
 * @param props.title - The card heading.
 * @param props.size - `sm` for phones and tablets, `md` for the desktop sidebar.
 * @param props.className - Extra classes for the outer card.
 * @param props.children - The card body.
 * @returns The card element.
 */
export function ConfigCard({
  icon,
  title,
  size,
  className = "",
  children,
}: {
  icon: ReactNode;
  title: string;
  size: CardSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-[#003366]/10 rounded-lg">{icon}</div>
        <h3 className={`font-semibold text-[#030E18] ${size === "sm" ? "text-sm" : ""}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/** Props for {@link CourseCard}. */
export interface CourseCardProps {
  size: CardSize;
  /** The course fixed by the page, if any. When set the card only describes it. */
  fixedCourse: CourseOption | null;
  /** True when the page fixed the course (so the picker is not shown). */
  isFixed: boolean;
  courses: CourseOption[];
  courseId: string;
  onSelect: (courseId: string) => void;
}

/**
 * Either the course picker (when the page did not fix a course) or a
 * read-only description of the fixed course.
 *
 * @param props - See {@link CourseCardProps}.
 * @param props.size - Card sizing.
 * @param props.fixedCourse - The fixed course.
 * @param props.isFixed - Whether the page fixed the course.
 * @param props.courses - The teacher's courses.
 * @param props.courseId - The selected course.
 * @param props.onSelect - Called with the chosen course id.
 * @returns The card element.
 */
export function CourseCard({ size, fixedCourse, isFixed, courses, courseId, onSelect }: CourseCardProps) {
  if (isFixed) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] flex items-center gap-3 mb-3">
        <div className="p-2 bg-[#003366]/10 rounded-lg">
          <BookOpen className={`${iconClass(size)} text-[#003366]`} />
        </div>
        <div className="flex flex-col">
          <span className="text-[#878787] text-xs font-medium">Course Description</span>
          <span className={`font-semibold text-[#030E18] ${size === "sm" ? "text-sm" : ""}`}>
            {fixedCourse?.description || "Course curriculum"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <ConfigCard icon={<BookOpen className={`${iconClass(size)} text-[#003366]`} />} title="Course Selection" size={size}>
      <select
        value={courseId}
        onChange={(e) => onSelect(e.target.value)}
        className={`w-full border border-[#F0F0F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all ${
          size === "sm" ? "px-3 py-2" : "px-4 py-3"
        }`}
        required
        disabled={courses.length === 0}
      >
        <option value="">{courses.length === 0 ? "No courses available" : "Select a course/subject"}</option>
        {courses.map((course) => (
          <option key={course._id} value={course._id}>
            {courseLabel(course)}
          </option>
        ))}
      </select>
    </ConfigCard>
  );
}

/**
 * Shows which term a new curriculum will be filed under, or that it could not
 * be determined.
 *
 * @param props - Card props.
 * @param props.size - Card sizing.
 * @param props.term - The term, or `null` when it could not be loaded.
 * @param props.isLoading - True while the term is still loading.
 * @returns The card element.
 */
export function TermCard({ size, term, isLoading }: { size: CardSize; term: TermOption | null; isLoading: boolean }) {
  const small = size === "sm";
  return (
    <ConfigCard icon={<Calendar className={`${iconClass(size)} text-[#003366]`} />} title="Term Information" size={size}>
      {term ? (
        <div className={`flex items-center bg-[#003366]/5 rounded-lg ${small ? "gap-2 p-2" : "gap-3 p-3"}`}>
          <CheckCircle className={`${iconClass(size)} text-[#003366]`} />
          <div>
            <p className={`${small ? "text-xs" : "text-sm"} font-medium text-[#030E18]`}>Current Term</p>
            <p className="text-xs text-[#6F6F6F]">{term.name}</p>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-2 rounded-lg ${small ? "p-2" : "p-3"} ${isLoading ? "bg-[#F8F8F8]" : "bg-red-50"}`}>
          <AlertCircle className={`${iconClass(size)} ${isLoading ? "text-[#878787]" : "text-red-600"}`} />
          <span className={`${small ? "text-xs" : "text-sm"} ${isLoading ? "text-[#6F6F6F]" : "text-red-700"}`}>
            {isLoading ? "Loading the current term…" : "Term information not available"}
          </span>
        </div>
      )}
    </ConfigCard>
  );
}

/** One row of the completion checklist. */
function StatusRow({ label, done, size }: { label: string; done: boolean; size: CardSize }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${size === "sm" ? "text-xs" : "text-sm"} text-[#6F6F6F]`}>{label}</span>
      {done ? (
        <CheckCircle className="w-4 h-4 text-[#003366]" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
      )}
    </div>
  );
}

/**
 * The course / term / content checklist.
 *
 * @param props - Card props.
 * @param props.size - `sm` lays the rows out in a grid, `md` stacks them.
 * @param props.hasCourse - Whether a course is selected.
 * @param props.hasTerm - Whether the term is known.
 * @param props.hasContent - Whether the editor holds content.
 * @param props.className - Extra classes for the card.
 * @returns The card element.
 */
export function StatusCard({
  size,
  hasCourse,
  hasTerm,
  hasContent,
  className = "",
}: {
  size: CardSize;
  hasCourse: boolean;
  hasTerm: boolean;
  hasContent: boolean;
  className?: string;
}) {
  const small = size === "sm";
  return (
    <div className={`bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#003366]/10 rounded-lg">
          <Clock className={`${iconClass(size)} text-[#003366]`} />
        </div>
        <h3 className={`font-semibold text-[#030E18] ${small ? "text-sm" : ""}`}>Status</h3>
      </div>
      <div className={small ? "grid grid-cols-3 gap-4" : "space-y-2"}>
        <StatusRow size={size} label={small ? "Course" : "Course Selected"} done={hasCourse} />
        <StatusRow size={size} label={small ? "Term" : "Term Loaded"} done={hasTerm} />
        <StatusRow size={size} label={small ? "Content" : "Content Added"} done={hasContent} />
      </div>
    </div>
  );
}
