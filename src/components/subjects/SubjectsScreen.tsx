"use client";

import React, { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/CustomToast";
import { TermPicker } from "@/components/tl/TermPicker";
import { card as cardClass, cardTitle, chip, pagePad, pageTitle, primaryButton } from "@/components/tl/styles";
import { detailMeta, subjectLabel, subjectsHref, taughtToast, type SubjectTab } from "@/hooks/subjects/scheme.logic";
import { useCourseResources, useMarkWeekTaught, useScheme, useSubjectCards } from "@/hooks/subjects/useSubjects";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import type { SchemeWeek, SubjectCard } from "@/types/subjects";
import { EditWeekSheet } from "./EditWeekSheet";
import { SchemePlan, weekRowId } from "./SchemePlan";
import { SubjectCards } from "./SubjectCards";
import { SubjectResources } from "./SubjectResources";
import { UploadResourceSheet } from "./UploadResourceSheet";

/** Props for {@link SubjectsScreen}. */
export interface SubjectsScreenProps {
  /** `?courseId=`: the subject to open. */
  initialCourseId?: string;
  /** `?tab=plan|resources`. */
  initialTab?: SubjectTab;
  /** `?week=`: scrolled to and highlighted on the plan; the upload sheet's default week. */
  initialWeek?: number;
}

/** How long a deep-linked week stays highlighted. */
export const WEEK_FLASH_MS = 2500;

const TABS: { key: SubjectTab; label: string }[] = [
  { key: "plan", label: "Scheme of work" },
  { key: "resources", label: "Resources" },
];

/**
 * A subject the teacher may not open: another teacher's course (403, or a
 * link to a course that is not one of their cards) or one that does not
 * exist (404) is final; anything else can be retried.
 *
 * @param props - The error (null for "not one of the cards") and a retry.
 * @param props.error - What the scheme request threw, or null.
 * @param props.onRetry - Refetches the scheme.
 * @returns The alert card.
 */
function SubjectLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const status = error === null ? 403 : error instanceof ApiError ? error.status : 0;
  const title = status === 403 ? "Not one of your subjects" : status === 404 ? "Subject not found" : "We could not load this subject";
  const text =
    status === 403
      ? "You don't teach this subject, so its scheme of work and resources are not available to you. Pick one of your subjects above."
      : status === 404
        ? "There is no subject with this link in your school. Pick one of your subjects above."
        : getErrorMessage(error, "Check your connection and try again.");
  return (
    <div className={cardClass} role="alert">
      <h2 className={cardTitle}>{title}</h2>
      <p className="mt-1.5 text-sm text-tl-muted">{text}</p>
      {status !== 403 && status !== 404 ? (
        <button type="button" className={`${primaryButton} mt-4`} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Grey rows while a scheme loads.
 *
 * @returns The skeleton.
 */
function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-5 py-4" role="status" aria-label="Loading the scheme of work">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-tl-line/70" />
      ))}
    </div>
  );
}

/**
 * The redesigned Subjects page: one card per subject the teacher teaches
 * (`GET /scheme-of-work/me`), and the open subject's week-by-week scheme of
 * work (`GET /scheme-of-work/course/:courseId`) and resources
 * (`GET /resources/course/:courseId`). Weeks can be edited and marked taught;
 * resources uploaded (filed under a week) and removed. A term picker shows
 * earlier terms. The address keeps `?courseId=&tab=`, and `?week=` scrolls to
 * and highlights a week.
 *
 * @param props - See {@link SubjectsScreenProps}.
 * @returns The screen.
 */
export function SubjectsScreen({ initialCourseId, initialTab, initialWeek }: SubjectsScreenProps) {
  const router = useRouter();
  const [termId, setTermId] = useState<string | undefined>(undefined);
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);
  const [tab, setTab] = useState<SubjectTab>(initialTab ?? "plan");
  const [focusWeek, setFocusWeek] = useState<number | undefined>(initialWeek);
  const [flashWeek, setFlashWeek] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<SchemeWeek | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string } | undefined>(undefined);
  // The week a link asked for, for the upload sheet's default (the address drops it once shown).
  const linkRef = useRef<{ courseId?: string; week?: number }>({ courseId: initialCourseId, week: initialWeek });

  // A link or back/forward that changes the address moves the screen with it.
  useEffect(() => {
    if (initialCourseId) setCourseId(initialCourseId);
    if (initialTab) setTab(initialTab);
    if (initialWeek) {
      setFocusWeek(initialWeek);
      linkRef.current = { courseId: initialCourseId, week: initialWeek };
    }
  }, [initialCourseId, initialTab, initialWeek]);

  const cards = useSubjectCards(termId);
  const list: readonly SubjectCard[] = cards.data ?? [];
  const owned = courseId ? list.find((c) => c.course.id === courseId) : undefined;
  // A link to a course that is not one of this term's cards: nothing is requested for it. (After
  // a term switch a course the teacher no longer has simply falls back to the first card.)
  const notMine = Boolean(courseId) && courseId === initialCourseId && !termId && cards.isSuccess && !cards.isPlaceholderData && !owned;
  const active: SubjectCard | undefined = owned ?? (notMine ? undefined : list[0]);
  const activeId = active?.course.id;

  const scheme = useScheme(activeId, termId);
  const schemeData = scheme.data && scheme.data.course.id === activeId ? scheme.data : undefined;
  const resources = useCourseResources(activeId, schemeData?.term.id);
  const markTaught = useMarkWeekTaught();

  // Remember what "current" resolved to, so the term picker can mark it.
  useEffect(() => {
    if (!termId && scheme.data) setCurrentTerm({ id: scheme.data.term.id, name: scheme.data.term.name });
  }, [termId, scheme.data]);

  // Keep the address in step so reloads and shared links land here.
  useEffect(() => {
    if (!activeId || typeof window === "undefined") return;
    const target = subjectsHref({ courseId: activeId, tab });
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  }, [activeId, tab, router]);

  // A deep-linked week: scroll to it once the plan is on screen, and highlight it briefly.
  useEffect(() => {
    if (!focusWeek || tab !== "plan" || !schemeData) return;
    const row = typeof document !== "undefined" ? document.getElementById(weekRowId(focusWeek)) : null;
    if (row && typeof row.scrollIntoView === "function") row.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashWeek(focusWeek);
    setFocusWeek(undefined);
  }, [focusWeek, tab, schemeData]);

  useEffect(() => {
    if (!flashWeek) return;
    const timer = setTimeout(() => setFlashWeek(undefined), WEEK_FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashWeek]);

  const pickCourse = (id: string) => {
    setCourseId(id);
    setFocusWeek(undefined);
    setFlashWeek(undefined);
  };

  const pickTerm = (next: string | undefined) => {
    setTermId(next);
    setFocusWeek(undefined);
  };

  const toggleTaught = (week: SchemeWeek) => {
    if (!active) return;
    const taught = !week.taughtAt;
    markTaught.mutate(
      { courseId: active.course.id, week: week.week, taught, termParam: termId, termId: schemeData?.term.id },
      {
        onSuccess: () => toast.success(taughtToast(week.week, taught)),
        onError: (error) => toast.error(getErrorMessage(error, "That change was not saved. Please try again.")),
      },
    );
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.key === tab);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].key);
    document.getElementById(`subjects-tab-${TABS[next].key}`)?.focus();
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3.5">
      <div>
        <h1 className={pageTitle}>Subjects</h1>
        <p className="mt-[5px] text-[15px] text-tl-muted">Your scheme of work and the resources you share, one subject at a time.</p>
      </div>
      <TermPicker id="subjects-term" value={termId} currentTermId={currentTerm?.id} currentTermName={currentTerm?.name} onChange={pickTerm} />
    </div>
  );

  if (cards.isPending) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <div className="flex flex-col gap-[18px]" role="status" aria-label="Loading your subjects">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[138px] animate-pulse rounded-[20px] bg-tl-line/70" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" />
        </div>
      </div>
    );
  }

  // §25 as built: without a current term (and no term picked) the cards answer 404.
  if (cards.isError && !cards.data && !termId && cards.error instanceof ApiError && cards.error.status === 404) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <section className={cardClass}>
          <h2 className={cardTitle}>No term is running</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            The school office has not set a current term yet, so there is no scheme of work to show. Pick an earlier term above to see its plan and resources.
          </p>
        </section>
      </div>
    );
  }

  if (cards.isError && !cards.data) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <div className={cardClass} role="alert">
          <h2 className={cardTitle}>We could not load your subjects</h2>
          <p className="mt-1.5 text-sm text-tl-muted">{getErrorMessage(cards.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void cards.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className={`${pagePad} flex flex-col gap-[18px]`}>
        {header}
        <section className={cardClass}>
          <h2 className={cardTitle}>No subjects yet</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            When the school office assigns you a subject for this term, its scheme of work and the resources you share show here.
          </p>
        </section>
      </div>
    );
  }

  const resourceCount = resources.data?.length ?? active?.resourceCount ?? 0;
  const schemeFailed = !schemeData && scheme.isError;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      {header}

      <SubjectCards cards={list} activeId={activeId} onPick={pickCourse} />

      {notMine || !active ? (
        <SubjectLoadError error={null} onRetry={() => undefined} />
      ) : schemeFailed && scheme.error instanceof ApiError && (scheme.error.status === 403 || scheme.error.status === 404) ? (
        <SubjectLoadError error={scheme.error} onRetry={() => void scheme.refetch()} />
      ) : (
        <section
          className="rounded-[22px] border border-tl-line bg-tl-surface shadow-[0_1px_2px_rgba(15,27,46,0.04)] dark:shadow-none"
          aria-labelledby="subjects-detail-title"
        >
          <div className="flex flex-wrap items-end justify-between gap-3.5 border-b border-tl-line-soft px-5 py-[18px]">
            <div className="min-w-0">
              <h2 id="subjects-detail-title" className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">
                {subjectLabel(active)}
              </h2>
              <p className="mt-1 text-[13px] text-tl-muted">{detailMeta(active, schemeData)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label={`${subjectLabel(active)} views`} className="flex flex-wrap gap-2" onKeyDown={onTabKey}>
                {TABS.map((t) => {
                  const on = t.key === tab;
                  return (
                    <button
                      key={t.key}
                      id={`subjects-tab-${t.key}`}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-controls="subjects-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => setTab(t.key)}
                      data-guide={t.key === "resources" ? "subjects-tab-resources" : undefined}
                      className={chip(on)}
                    >
                      {t.key === "resources" ? `${t.label} · ${resourceCount}` : t.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={primaryButton}
                onClick={() => setUploadOpen(true)}
                title="Share a new file with this class"
                data-guide="subjects-upload"
              >
                Upload resource
              </button>
            </div>
          </div>

          <div role="tabpanel" id="subjects-panel" aria-labelledby={`subjects-tab-${tab}`}>
            {tab === "plan" ? (
              schemeData ? (
                <SchemePlan
                  card={active}
                  scheme={schemeData}
                  flashWeek={flashWeek}
                  pendingWeek={markTaught.isPending ? markTaught.variables?.week : undefined}
                  onToggleTaught={toggleTaught}
                  onEdit={setEditing}
                />
              ) : scheme.isError ? (
                <div role="alert" className="px-5 py-5">
                  <p className="text-sm text-tl-muted">{getErrorMessage(scheme.error, "The scheme of work could not be loaded. Check your connection and try again.")}</p>
                  <button type="button" className={`${primaryButton} mt-3`} onClick={() => void scheme.refetch()}>
                    Try again
                  </button>
                </div>
              ) : (
                <PlanSkeleton />
              )
            ) : (
              <SubjectResources
                card={active}
                resources={resources.data}
                loading={resources.isPending}
                error={resources.error}
                onRetry={() => void resources.refetch()}
              />
            )}
          </div>
        </section>
      )}

      {active ? (
        <EditWeekSheet card={active} week={editing} onClose={() => setEditing(null)} termParam={termId} termId={schemeData?.term.id} />
      ) : null}
      <UploadResourceSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        cards={list}
        initialCourseId={activeId}
        initialWeek={linkRef.current.courseId === activeId ? linkRef.current.week : undefined}
        termParam={termId}
      />
    </div>
  );
}
