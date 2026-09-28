"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { shouldRecordResourceView, subjectsService } from "@/app/services/subjects/subjects.service";
import { toast } from "@/components/CustomToast";
import { ConfirmSheet } from "@/components/tl/ConfirmSheet";
import { dangerGhostButton, focusRing, primaryButton } from "@/components/tl/styles";
import { kindChip, resourceHref, resourceMeta, viewsText, type KindChip } from "@/hooks/subjects/scheme.logic";
import { useRemoveResource } from "@/hooks/subjects/useSubjects";
import { getErrorMessage } from "@/lib/apiError";
import type { CourseResource, SubjectCard } from "@/types/subjects";

/** The kind chip's colours, from `tl-*` tokens so both themes pass AA. */
const CHIP_TONE: Record<KindChip["tone"], string> = {
  danger: "bg-tl-danger-bg text-tl-danger",
  warning: "bg-tl-warning-bg text-tl-warning",
  accent: "bg-tl-accent-bg text-tl-accent",
  info: "bg-tl-select text-tl-brand",
  success: "bg-tl-success-bg text-tl-success",
  muted: "bg-tl-track text-tl-muted",
};

/** Props for {@link SubjectResources}. */
export interface SubjectResourcesProps {
  card: SubjectCard;
  resources: readonly CourseResource[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

/**
 * The Resources tab (the design's `resRows`): what the teacher shared for
 * this course and term, each with its kind, week, size, date, who can see it
 * and unique views, and "Remove" behind a confirmation. Opening a resource
 * never records a view: only students and parents count (§24).
 *
 * @param props - See {@link SubjectResourcesProps}.
 * @returns The tab's content.
 */
export function SubjectResources({ card, resources, loading, error, onRetry }: SubjectResourcesProps) {
  const { user } = useAuth();
  const remove = useRemoveResource();
  const [removing, setRemoving] = useState<CourseResource | null>(null);
  const label = `${card.course.title} · ${card.class.name}`;
  const count = resources?.length ?? card.resourceCount;

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove.mutateAsync({ id: removing._id, courseId: card.course.id });
      toast.success("Resource removed.");
      setRemoving(null);
    } catch (caught) {
      toast.error(getErrorMessage(caught, "The resource was not removed. Please try again."));
    }
  };

  const opened = (resource: CourseResource) => {
    // §24: views are counted for students and parents only, never for the teacher who shared it.
    if (shouldRecordResourceView(user?.role)) subjectsService.recordResourceView(resource._id);
  };

  return (
    <div className="px-5 pb-[18px] pt-1.5">
      <div className="py-3">
        <h3 className="text-[15px] font-extrabold text-tl-ink">Resources · {count}</h3>
        <p className="mt-1 text-[13px] text-tl-muted">Students in {card.class.name} see these in their portal. Parents see them if you allow it.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 border-t border-tl-line-soft pt-3" role="status" aria-label="Loading resources">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-tl-line/70" />
          ))}
        </div>
      ) : !resources ? (
        <div role="alert" className="border-t border-tl-line-soft py-4">
          <p className="text-sm text-tl-muted">{getErrorMessage(error, "The resources could not be loaded. Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : resources.length === 0 ? (
        <p className="border-t border-tl-line-soft py-5 text-sm text-tl-muted">Nothing shared for this subject yet.</p>
      ) : (
        <ul aria-label={`Resources for ${label}`}>
          {resources.map((r) => {
            const chip = kindChip(r);
            const href = resourceHref(r);
            return (
              <li key={r._id} className="flex flex-wrap items-center gap-3.5 border-t border-tl-line-soft py-3.5">
                <span className={`w-[62px] shrink-0 rounded-[9px] py-2 text-center text-[11px] font-extrabold ${CHIP_TONE[chip.tone]}`}>{chip.label}</span>
                <div className="min-w-[200px] flex-1">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => opened(r)}
                      className={`rounded text-[15px] font-bold text-tl-ink hover:underline ${focusRing}`}
                    >
                      {r.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-[15px] font-bold text-tl-ink">{r.name}</span>
                  )}
                  <div className="mt-[3px] text-[13px] text-tl-muted">{resourceMeta(r)}</div>
                </div>
                <div className="text-[13px] font-bold text-tl-faint">{viewsText(r.viewCount ?? 0)}</div>
                <button type="button" className={dangerGhostButton} onClick={() => setRemoving(r)} title="Remove this resource for students">
                  Remove<span className="sr-only"> {r.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmSheet
        open={Boolean(removing)}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
        eyebrowText="Resources"
        title={`Remove “${removing?.name ?? ""}”?`}
        body="Students will no longer see it. This cannot be undone."
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={remove.isPending}
        danger
      />
    </div>
  );
}
