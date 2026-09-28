"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Sheet, SheetRow } from "@/components/tl/Sheet";
import { ghostButton, primaryButton, rowButton } from "@/components/tl/styles";
import { toast } from "@/components/CustomToast";
import { useCompleteTour } from "@/hooks/today/useTeacherToday";
import { logger } from "@/lib/logger";

/** One step of the portal tour (copy from the design's TOUR). */
export interface TourStep {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    title: "Today is your starting point",
    body: "The navy card shows the lesson you are in right now, with this week's topic and time left. Below it, ‘Needs your attention’ lists only what is outstanding: an open register, missing scores, an unanswered parent.",
    href: "/dashboard",
    linkLabel: "Open Today",
  },
  {
    title: "Registers in one pass",
    body: "Pick the class, tap Present, Late or Absent for each student, or use ‘Mark the rest present’ and change the few who are not. Students on leave approved by the office are already marked. Absences ask for a reason, and parents are notified when you submit.",
    href: "/attendance",
    linkLabel: "Open Attendance",
  },
  {
    title: "Scores save as drafts",
    body: "Grading shows one assessment for one class. Type scores straight into the sheet; anything above the maximum turns red. Save a draft as often as you like. Publish only when every score is in, and the scores lock.",
    href: "/grading",
    linkLabel: "Open Grading",
  },
  {
    title: "Plan the term by week",
    body: "Subjects holds the scheme of work for each class you teach. Write objectives, mark a week taught, and attach resources to the week they belong to. Students see resources in their own portal.",
    href: "/subjects",
    linkLabel: "Open Subjects",
  },
  {
    title: "Timetable and lessons",
    body: "Every lesson in the timetable opens quick actions: take the register, open the week's plan, share a resource or message the class group.",
    href: "/timetable",
    linkLabel: "Open Timetable",
  },
  {
    title: "Messages and alerts",
    body: "Parents, colleagues and class groups are in Messages. Deadlines and announcements are in Notifications. Choose what reaches you in Settings → Notifications.",
    href: "/messages",
    linkLabel: "Open Messages",
  },
];

interface TourContextValue {
  openTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/**
 * Opens the portal tour from anywhere inside the shell (Today's setup card,
 * Settings → Help).
 *
 * @returns `{ openTour }`, or null outside the shell.
 */
export function useTour(): TourContextValue | null {
  return useContext(TourContext);
}

/**
 * Holds the tour sheet for the whole shell. Finishing the last step stores
 * `guides.tourCompleted` on the teacher's preferences, which ticks "Take the
 * tour" on Today's setup card.
 *
 * @param props - The shell's children.
 * @param props.children - The page.
 * @returns The provider with the sheet.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const complete = useCompleteTour();

  const openTour = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openTour }), [openTour]);

  const index = Math.min(step, TOUR_STEPS.length - 1);
  const current = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  const finish = () => {
    setOpen(false);
    complete.mutate(undefined, {
      onSuccess: () => toast.success("Tour complete. You can replay it from Settings under Help."),
      onError: (error) => logger.error("tour", "could not store tour completion", error),
    });
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        eyebrowText="Getting started"
        title={current.title}
        footer={
          <>
            {index > 0 ? (
              <button type="button" className={ghostButton} onClick={() => setStep(index - 1)}>
                Back
              </button>
            ) : null}
            <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={isLast ? finish : () => setStep(index + 1)}>
              {isLast ? "Finish" : "Next"}
            </button>
          </>
        }
      >
        <p className="text-[13px] font-bold text-tl-faint" aria-live="polite">
          Step {index + 1} of {TOUR_STEPS.length}
        </p>
        <p className="text-sm leading-[1.7] text-tl-body">{current.body}</p>
        <SheetRow
          label={current.linkLabel}
          description="Take me there now"
          action={
            <Link href={current.href} className={rowButton} onClick={() => setOpen(false)}>
              Go
            </Link>
          }
        />
      </Sheet>
    </TourContext.Provider>
  );
}
