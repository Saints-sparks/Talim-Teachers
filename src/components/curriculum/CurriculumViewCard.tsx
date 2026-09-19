import React from "react";
import { Calendar, Clock, FileText, School, User } from "lucide-react";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";
import type { StudentPreview } from "@/hooks/curriculum/useClassPreview";
import { formatDate } from "./CurriculumCard";
import { sanitizeCurriculumHtml } from "./sanitizeHtml";
import { fileNameOf } from "./editor/types";

/** A grey label chip. */
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gray-100 text-[#0A2343] text-xs font-semibold rounded px-3 py-1">{children}</span>
);

/** One "icon, label, value chip" row of the info grid; hidden when there is no value. */
const InfoRow = ({ icon, label, value, iconFirst = true }: { icon: React.ReactNode; label: string; value?: string | null; iconFirst?: boolean }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      {iconFirst && icon}
      <span className="font-medium text-[#030E18]">{label}</span>
      {!iconFirst && icon}
      <Chip>{value}</Chip>
    </div>
  );
};

/** The three-student avatar stack. */
const AvatarStack = ({ students }: { students: StudentPreview[] }) => (
  <div className="flex -space-x-2 ml-2">
    {students.map((student, index) =>
      student.src ? (
        <img
          key={index}
          src={student.src}
          alt={student.name}
          className="w-8 h-8 rounded-full border-2 border-white shadow -ml-1"
          style={{ zIndex: 10 - index }}
        />
      ) : (
        <div
          key={index}
          className="w-8 h-8 rounded-full border-2 border-white bg-[#003366] text-white shadow -ml-1 flex items-center justify-center text-[10px] font-semibold"
          style={{ zIndex: 10 - index }}
          title={student.name}
        >
          {student.initials}
        </div>
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
 * The read-only curriculum card on `/curriculum/view`: subject, class, term,
 * teacher, school, dates, the content and its attachments. Everything shown
 * comes from the API; a field the API did not send is left out rather than
 * filled with sample text.
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

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-[#F0F0F0] p-8">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-[#030E18]">{courseTitle(curriculum)}</span>
            {course?.courseCode && <Chip>{course.courseCode}</Chip>}
          </div>
          {course?.description && <span className="text-[#6F6F6F] text-sm">{course.description}</span>}
        </div>
        <div className="flex items-center gap-4">
          {course?.className && (
            <div className="flex items-center gap-2">
              <Chip>Class</Chip>
              <Chip>{course.className}</Chip>
            </div>
          )}
          {students.length > 0 && <AvatarStack students={students} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <InfoRow icon={<Calendar className="w-5 h-5 text-[#003366]" />} label="Term" value={term?.name} />
        <InfoRow icon={<User className="w-5 h-5 text-[#003366]" />} label="Teacher" value={teacherName(curriculum)} iconFirst={false} />
        <InfoRow icon={<School className="w-5 h-5 text-[#003366]" />} label="School" value={course?.schoolName} />
        <InfoRow icon={<Clock className="w-5 h-5 text-[#003366]" />} label="Last Updated" value={curriculum.updatedAt ? formatDate(curriculum.updatedAt) : null} />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 text-[#030E18]">Curriculum Content</h2>
        <div className="bg-[#F8F8F8] rounded-xl p-5">
          {html.trim() ? (
            <div className="prose max-w-none text-[#030E18] leading-relaxed dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="text-[#6F6F6F] font-medium">No content added yet</div>
          )}
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-[#030E18]">Attachments</h2>
          <ul className="space-y-2">
            {attachments.map((url, index) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#003366] hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  {fileNameOf(url, `Attachment ${index + 1}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-8 text-sm text-[#878787] mt-6">
        {curriculum.createdAt && (
          <div>
            <span className="font-medium">Created:</span> {formatDate(curriculum.createdAt)}
          </div>
        )}
        {curriculum.updatedAt && (
          <div>
            <span className="font-medium">Last Modified:</span> {formatDate(curriculum.updatedAt)}
          </div>
        )}
      </div>
    </div>
  );
});
CurriculumViewCard.displayName = "CurriculumViewCard";

export default CurriculumViewCard;
