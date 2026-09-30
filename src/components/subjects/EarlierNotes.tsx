"use client";

import React, { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { focusRing, primaryButton, textLink } from "@/components/tl/styles";
import { richTextClass } from "@/components/curriculum/richText";
import { sanitizeCurriculumHtml } from "@/components/curriculum/sanitizeHtml";
import { shortDate } from "@/hooks/subjects/scheme.logic";
import { useLegacyCurriculum } from "@/hooks/subjects/useSubjects";
import { getErrorMessage } from "@/lib/apiError";
import type { SubjectCard } from "@/types/subjects";

/** Props for {@link EarlierNotes}. */
export interface EarlierNotesProps {
  legacy: NonNullable<SubjectCard["legacyCurriculum"]>;
  /** The Curriculum page for this subject, where the text is edited. */
  editHref: string;
}

/** Props for {@link NoWrittenCurriculum}. */
export interface NoWrittenCurriculumProps {
  /** The Curriculum page for this subject, where one is written. */
  writeHref: string;
}

/**
 * Under a scheme of work whose subject has no written curriculum this term:
 * what it is, and where to write one.
 *
 * @param props - See {@link NoWrittenCurriculumProps}.
 * @param props.writeHref - The Curriculum page for the subject.
 * @returns The row.
 */
export function NoWrittenCurriculum({ writeHref }: NoWrittenCurriculumProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-tl-line-soft px-5 py-4">
      <div className="min-w-[220px] flex-1">
        <h3 className="text-[15px] font-bold text-tl-ink">Written curriculum</h3>
        <p className="mt-0.5 text-[13px] text-tl-muted">Students also read a written curriculum for each subject in their portal. This one has none for the term.</p>
      </div>
      <Link href={writeHref} className={textLink} data-guide="subjects-curriculum">
        Write it on the Curriculum page →
      </Link>
    </div>
  );
}

/**
 * The written (text) curriculum of the course and term, read only here,
 * collapsed until the teacher opens it (only then is `GET /curriculum/:id`
 * requested). The editor's HTML is sanitised before it is shown. A link
 * opens the Curriculum page, where it is edited.
 *
 * @param props - See {@link EarlierNotesProps}.
 * @param props.legacy - The curriculum's id and last update.
 * @param props.editHref - The Curriculum page for the subject.
 * @returns The collapsible section.
 */
export function EarlierNotes({ legacy, editHref }: EarlierNotesProps) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const curriculum = useLegacyCurriculum(legacy.id, open);
  const html = useMemo(() => sanitizeCurriculumHtml(curriculum.data?.content ?? ""), [curriculum.data]);
  const updated = shortDate(curriculum.data?.updatedAt ?? legacy.updatedAt);

  return (
    <div className="border-t border-tl-line-soft px-5 py-4">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
          className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl text-left ${focusRing}`}
        >
          <span>
            <span className="block text-[15px] font-bold text-tl-ink">Earlier notes</span>
            <span className="mt-0.5 block text-[13px] font-normal text-tl-muted">
              The written curriculum students read in their portal, read only here.{updated ? ` Last updated ${updated}.` : ""}
            </span>
          </span>
          <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-tl-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={regionId} hidden={!open} className="mt-3">
        {!open ? null : curriculum.isPending ? (
          <div className="h-24 animate-pulse rounded-2xl bg-tl-line/70" role="status" aria-label="Loading earlier notes" />
        ) : curriculum.isError ? (
          <div role="alert" className="rounded-2xl border border-tl-line-soft bg-tl-subtle px-4 py-3.5">
            <p className="text-sm text-tl-muted">
              {getErrorMessage(curriculum.error, "Your earlier notes could not be loaded.")}
            </p>
            <button type="button" className={`${primaryButton} mt-3`} onClick={() => void curriculum.refetch()}>
              Try again
            </button>
          </div>
        ) : html.trim() ? (
          <div className={`rounded-2xl border border-tl-line-soft bg-tl-subtle px-4 py-3.5 ${richTextClass}`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-tl-muted">These notes are empty.</p>
        )}
      </div>
      <Link href={editHref} className={`${textLink} mt-1`} data-guide="subjects-curriculum">
        Edit it on the Curriculum page →
      </Link>
    </div>
  );
}
