import React from "react";
import { cardFrame, eyebrow, focusRing, pill, pillTone } from "@/components/tl/styles";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";
import type { StudentPreview } from "@/hooks/curriculum/useClassPreview";
import { formatDate } from "./CurriculumCard";
import { paperClass } from "./richText";
import { sanitizeCurriculumHtml } from "./sanitizeHtml";
import { fileNameOf } from "./editor/types";

/**
 * Up to three students of the class as overlapping initials or photos,
 * decorative (the class name is beside it).
 *
 * @param props - The students.
 * @param props.students - A few students of the class.
 * @returns The stack.
 */
const AvatarStack = ({ students }: { students: StudentPreview[] }) => (
  <div className="flex -space-x-2" aria-hidden>
    {students.map((student, index) =>
      student.src ? (
        <img key={index} src={student.src} alt="" className="h-8 w-8 rounded-full border-2 border-tl-surface object-cover" style={{ zIndex: 10 - index }} />
      ) : (
        <span
          key={index}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-tl-surface bg-tl-select text-[10px] font-extrabold text-tl-brand"
          style={{ zIndex: 10 - index }}
        >
          {student.initials}
        </span>
      ),
    )}
  </div>
);

/** Props for {@link CurriculumViewCard}. */
export interface CurriculumViewCardProps {
  curriculum: Curriculum;
  students: StudentPreview[];
}

/**
 * The read-only curriculum on `/curriculum/view`, in the redesign: the
 * subject, code and class, the facts, the text on a white page (cleaned
 * before it is shown) and the attachments. Everything shown comes from the
 * API; a field the API did not send is left out rather than filled in.
 *
 * @param props - See {@link CurriculumViewCardProps}.
 * @param props.curriculum - The curriculum to show.
 * @param props.students - A few students of the class, for the avatar stack.
 * @returns The card element.
 */
const CurriculumViewCard = React.forwardRef<HTMLDivElement, CurriculumViewCardProps>(({ curriculum, students }, ref) => {
  const course = courseOf(curriculum);
  const term = termOf(curriculum);
  const html = sanitizeCurriculumHtml(curriculum.content ?? "");
  const attachments = curriculum.attachments ?? [];
  const facts = [
    ["Term", term?.name],
    ["Teacher", teacherName(curriculum)],
    ["School", course?.schoolName],
    ["Created", curriculum.createdAt ? formatDate(curriculum.createdAt) : null],
    ["Last updated", curriculum.updatedAt ? formatDate(curriculum.updatedAt) : null],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <article ref={ref} className={`${cardFrame} p-[clamp(18px,2.4vw,26px)]`} aria-labelledby="curriculum-view-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={eyebrow}>Written curriculum</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 id="curriculum-view-title" className="text-[clamp(22px,3vw,28px)] font-extrabold tracking-[-0.5px] text-tl-ink">
              {courseTitle(curriculum)}
            </h1>
            {course?.courseCode ? <span className={`${pill} ${pillTone.info}`}>{course.courseCode}</span> : null}
          </div>
          {course?.description ? <p className="mt-1 text-sm text-tl-muted">{course.description}</p> : null}
        </div>
        {course?.className ? (
          <div className="flex items-center gap-2.5">
            <span className={`${pill} ${pillTone.muted}`}>{course.className}</span>
            {students.length > 0 ? <AvatarStack students={students} /> : null}
          </div>
        ) : null}
      </div>

      {facts.length ? (
        <dl className="mt-5 grid gap-x-5 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-tl-ink">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section className="mt-5" aria-labelledby="curriculum-view-content">
        <h2 id="curriculum-view-content" className="text-[17px] font-extrabold text-tl-ink">
          Curriculum
        </h2>
        <div className="mt-2 rounded-2xl border border-tl-line-soft bg-white p-5">
          {html.trim() ? (
            <div className={paperClass} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm font-bold text-[#5B6B80]">No content added yet.</p>
          )}
        </div>
      </section>

      {attachments.length > 0 ? (
        <section className="mt-5" aria-labelledby="curriculum-view-attachments">
          <h2 id="curriculum-view-attachments" className="text-[17px] font-extrabold text-tl-ink">
            Attachments
          </h2>
          <ul className="mt-1 flex flex-col">
            {attachments.map((url, index) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-[44px] items-center rounded-md text-sm font-bold text-tl-link hover:underline ${focusRing}`}
                >
                  {fileNameOf(url, `Attachment ${index + 1}`)}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
});
CurriculumViewCard.displayName = "CurriculumViewCard";

export default CurriculumViewCard;
