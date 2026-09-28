"use client";

import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { focusRing, primaryButton } from "@/components/tl/styles";
import { sanitizeCurriculumHtml } from "@/components/curriculum/sanitizeHtml";
import { shortDate } from "@/hooks/subjects/scheme.logic";
import { useLegacyCurriculum } from "@/hooks/subjects/useSubjects";
import { getErrorMessage } from "@/lib/apiError";
import type { SubjectCard } from "@/types/subjects";

/** Props for {@link EarlierNotes}. */
export interface EarlierNotesProps {
  legacy: NonNullable<SubjectCard["legacyCurriculum"]>;
}

/**
 * The old text curriculum of the course and term, read only, collapsed until
 * the teacher opens it (only then is `GET /curriculum/:id` requested). The
 * editor's HTML is sanitised before it is shown.
 *
 * @param props - See {@link EarlierNotesProps}.
 * @returns The collapsible section.
 */
export function EarlierNotes({ legacy }: EarlierNotesProps) {
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
              Your curriculum text from before the scheme of work, read only.{updated ? ` Last updated ${updated}.` : ""}
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
          <div
            className="rounded-2xl border border-tl-line-soft bg-tl-subtle px-4 py-3.5 text-sm leading-[1.7] text-tl-body [&_a]:text-tl-link [&_a]:underline [&_h1]:text-lg [&_h1]:font-extrabold [&_h2]:text-base [&_h2]:font-extrabold [&_h3]:font-extrabold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_table]:w-full [&_td]:border [&_td]:border-tl-line [&_td]:p-1.5 [&_th]:border [&_th]:border-tl-line [&_th]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-tl-muted">These notes are empty.</p>
        )}
      </div>
    </div>
  );
}
