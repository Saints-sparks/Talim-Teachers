import type { ReactNode } from "react";
import { AlertCircle, CheckCircle, ChevronDown, Circle } from "lucide-react";
import { focusRing } from "@/components/tl/styles";
import { courseLabel, type CardSize, type CourseOption, type TermOption } from "./types";

/**
 * A titled panel of the editor's side column, in the redesign's tokens.
 * `size` is kept for the callers; the panel is the same at every width.
 *
 * @param props - Frame props.
 * @param props.title - The panel heading.
 * @param props.size - Accepted for compatibility; unused.
 * @param props.className - Extra classes for the panel.
 * @param props.children - The panel body.
 * @param props.icon - Accepted for compatibility; the redesign shows no icon.
 * @returns The panel element.
 */
export function ConfigCard({
  title,
  className = "",
  children,
}: {
  icon?: ReactNode;
  title: string;
  size?: CardSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-[18px] border border-tl-line bg-tl-surface px-4 py-3.5 ${className}`}>
      <h2 className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
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
 * Either the subject picker (when the page did not fix a course) or the
 * fixed course's name and description.
 *
 * @param props - See {@link CourseCardProps}.
 * @param props.size - Card sizing (unused).
 * @param props.fixedCourse - The fixed course.
 * @param props.isFixed - Whether the page fixed the course.
 * @param props.courses - The teacher's courses.
 * @param props.courseId - The selected course.
 * @param props.onSelect - Called with the chosen course id.
 * @returns The panel element.
 */
export function CourseCard({ fixedCourse, isFixed, courses, courseId, onSelect }: CourseCardProps) {
  if (isFixed) {
    return (
      <ConfigCard title="Subject">
        <p className="text-[15px] font-extrabold text-tl-ink">{fixedCourse ? courseLabel(fixedCourse) : "This subject"}</p>
        {fixedCourse?.description ? <p className="mt-0.5 text-[13px] text-tl-muted">{fixedCourse.description}</p> : null}
      </ConfigCard>
    );
  }

  return (
    <ConfigCard title="Subject">
      <label htmlFor="curriculum-course" className="sr-only">
        Subject
      </label>
      <div className="relative">
        <select
          id="curriculum-course"
          value={courseId}
          onChange={(e) => onSelect(e.target.value)}
          className={`min-h-[46px] w-full cursor-pointer appearance-none rounded-[13px] border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-[15px] font-bold text-tl-ink disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          required
          disabled={courses.length === 0}
        >
          <option value="">{courses.length === 0 ? "No subjects available" : "Choose a subject"}</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {courseLabel(course)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
      </div>
    </ConfigCard>
  );
}

/**
 * Which term a new curriculum is filed under, or that it could not be
 * found.
 *
 * @param props - Card props.
 * @param props.size - Card sizing (unused).
 * @param props.term - The term, or `null` when it could not be loaded.
 * @param props.isLoading - True while the term is still loading.
 * @returns The panel element.
 */
export function TermCard({ term, isLoading }: { size?: CardSize; term: TermOption | null; isLoading: boolean }) {
  return (
    <ConfigCard title="Term">
      {term ? (
        <p className="text-[15px] font-extrabold text-tl-ink">
          {term.name} <span className="text-[13px] font-bold text-tl-muted">· current term</span>
        </p>
      ) : isLoading ? (
        <p className="text-sm text-tl-muted">Loading the current term…</p>
      ) : (
        <p className="flex items-start gap-1.5 text-sm font-bold text-tl-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The current term could not be found. Ask the school office to set it.
        </p>
      )}
    </ConfigCard>
  );
}

/**
 * One line of the checklist.
 *
 * @param props - The line.
 * @param props.label - What is checked.
 * @param props.done - Whether it is done.
 * @returns The line.
 */
function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${done ? "font-bold text-tl-success" : "text-tl-muted"}`}>
      {done ? <CheckCircle className="h-4 w-4 shrink-0" aria-hidden /> : <Circle className="h-4 w-4 shrink-0" aria-hidden />}
      <span>
        <span className="sr-only">{done ? "Done: " : "Not yet: "}</span>
        {label}
      </span>
    </li>
  );
}

/**
 * The subject / term / text checklist.
 *
 * @param props - Card props.
 * @param props.size - Card sizing (unused).
 * @param props.hasCourse - Whether a course is selected.
 * @param props.hasTerm - Whether the term is known.
 * @param props.hasContent - Whether the editor holds content.
 * @param props.className - Extra classes for the panel.
 * @returns The panel element.
 */
export function StatusCard({
  hasCourse,
  hasTerm,
  hasContent,
  className = "",
}: {
  size?: CardSize;
  hasCourse: boolean;
  hasTerm: boolean;
  hasContent: boolean;
  className?: string;
}) {
  return (
    <ConfigCard title="Before you save" className={className}>
      <ul className="flex flex-col gap-1.5">
        <StatusRow label="Subject chosen" done={hasCourse} />
        <StatusRow label="Term found" done={hasTerm} />
        <StatusRow label="Text written" done={hasContent} />
      </ul>
    </ConfigCard>
  );
}
