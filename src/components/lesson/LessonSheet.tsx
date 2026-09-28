"use client";

import React from "react";
import Link from "next/link";
import { Sheet, SheetRow } from "@/components/tl/Sheet";
import { ghostButton, rowButton } from "@/components/tl/styles";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { displayRange, lessonTitle } from "@/hooks/today/today.logic";
import { registerRoute, schemeOfWorkRoute } from "@/hooks/today/today.routes";
import { groupPeriodLabel, type LessonGroup } from "@/hooks/timetable/timetableWeek.logic";
import { useMarkTaught } from "@/hooks/today/useTeacherToday";

/** Props for {@link LessonSheet}. */
export interface LessonSheetProps {
  /** The lesson (or double period) to show; null closes the sheet. */
  group: LessonGroup | null;
  /** The current term, for the taught toggle (the server defaults to it anyway). */
  termId?: string;
  onClose: () => void;
  /** Opens the resource upload for this course and week. */
  onShareResource: (courseId: string, week?: number) => void;
}

/**
 * The lesson sheet: "Friday · Period 4 · 10:20 – 11:00", the class and
 * course, the room, this week's topic and objectives, and the lesson's
 * actions — take the register (class teacher only), mark the week taught (or
 * undo), open the scheme of work, share a resource, message the class.
 *
 * @param props - See {@link LessonSheetProps}.
 * @returns The sheet.
 */
export function LessonSheet({ group, termId, onClose, onShareResource }: LessonSheetProps) {
  const markTaught = useMarkTaught();
  const lesson = group?.lesson;

  const toggleTaught = () => {
    if (!lesson?.topic) return;
    const taught = !lesson.topic.taughtAt;
    markTaught.mutate(
      { courseId: lesson.course.id, week: lesson.topic.week, termId, taught },
      {
        onSuccess: () => toast.success(taught ? `Week ${lesson.topic?.week} marked as taught.` : "Marked as not taught."),
        onError: (error) => toast.error(getErrorMessage(error, "Could not update the scheme of work. Please try again.")),
      },
    );
  };

  return (
    <Sheet
      open={Boolean(group)}
      onOpenChange={(open) => !open && onClose()}
      eyebrowText={group && lesson ? `${lesson.day} · ${groupPeriodLabel(group)} · ${displayRange(group.startTime, group.endTime)}` : ""}
      title={lesson ? lessonTitle(lesson) : ""}
      subtitle={
        lesson ? (
          <>
            {lesson.studentCount} {lesson.studentCount === 1 ? "student" : "students"} · {lesson.course.code}
            <br />
            {lesson.room ? `Room: ${lesson.room}` : "No room set"}
          </>
        ) : undefined
      }
      footer={
        <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={onClose}>
          Close
        </button>
      }
    >
      {lesson ? (
        <>
          {lesson.cancelled ? (
            <p role="status" className="rounded-[14px] border border-tl-line-soft bg-tl-danger-bg p-3.5 text-[13px] font-bold text-tl-danger">
              Cancelled: {lesson.cancelled.reason}
            </p>
          ) : null}

          <section>
            <h3 className="mb-1.5 text-[15px] font-extrabold tracking-[-0.2px] text-tl-ink">
              {lesson.topic ? `Week ${lesson.topic.week} topic` : "This week's topic"}
            </h3>
            <p className="text-sm leading-[1.7] text-tl-body">
              {lesson.topic?.topic
                ? `${lesson.topic.topic}. ${lesson.topic.objectives || "No objectives written yet."}`
                : "Nothing is planned for this week in the scheme of work yet."}
            </p>
          </section>

          {lesson.isClassTeacher ? (
            <SheetRow
              label="Take register"
              description={`Morning register for ${lesson.class.name}`}
              action={
                <Link href={registerRoute(lesson.class.id, lesson.date)} className={rowButton}>
                  Open
                </Link>
              }
            />
          ) : null}

          {lesson.topic ? (
            <SheetRow
              label={lesson.topic.taughtAt ? "Taught" : "Mark as taught"}
              description={
                lesson.topic.taughtAt
                  ? `Week ${lesson.topic.week} is ticked off in the scheme of work`
                  : `Ticks off week ${lesson.topic.week} in the scheme of work`
              }
              action={
                <button type="button" className={rowButton} onClick={toggleTaught} disabled={markTaught.isPending}>
                  {lesson.topic.taughtAt ? "Undo" : "Mark taught"}
                </button>
              }
            />
          ) : null}

          <SheetRow
            label="Scheme of work"
            description={lesson.topic ? `Objectives and progress for week ${lesson.topic.week}` : "Objectives and progress by week"}
            action={
              <Link href={schemeOfWorkRoute(lesson.course.id, lesson.topic?.week)} className={rowButton}>
                Open
              </Link>
            }
          />
          <SheetRow
            label="Share a resource"
            description={lesson.topic ? `For ${lesson.course.title} · ${lesson.class.name}, week ${lesson.topic.week}` : `For ${lesson.course.title} · ${lesson.class.name}`}
            action={
              <button type="button" className={rowButton} onClick={() => onShareResource(lesson.course.id, lesson.topic?.week)}>
                Upload
              </button>
            }
          />
          <SheetRow
            label="Message the class"
            description={`The ${lesson.class.name} class group in Messages`}
            action={
              <Link href="/messages" className={rowButton}>
                Message
              </Link>
            }
          />
        </>
      ) : null}
    </Sheet>
  );
}
