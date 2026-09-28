"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Sheet, SheetRow } from "@/components/tl/Sheet";
import { chip, fieldControl, fieldLabel, ghostButton, primaryButton, rowButton } from "@/components/tl/styles";
import { formatBytes, subjectLabel, uploadDoneNote, uploadNamePlaceholder, uploadWeekLabel } from "@/hooks/subjects/scheme.logic";
import { UPLOAD_ACCEPT, maxUploadBytes, megabytes, uploadStatusText, validateUpload } from "@/hooks/subjects/upload.logic";
import { useResourceUploader, useScheme } from "@/hooks/subjects/useSubjects";
import type { ResourceVisibility, SubjectCard } from "@/types/subjects";

/** Props for {@link UploadResourceSheet}. */
export interface UploadResourceSheetProps {
  open: boolean;
  onClose: () => void;
  /** All the teacher's subjects (the "Subject and class" chips). */
  cards: readonly SubjectCard[];
  /** The subject to start on (the open one). */
  initialCourseId: string | undefined;
  /** The week to start on for that subject (a deep link's `?week=`); its current week otherwise. */
  initialWeek: number | undefined;
  /** The page's term param (undefined for the current term). */
  termParam: string | undefined;
}

const VISIBILITY: { value: ResourceVisibility; label: string }[] = [
  { value: "students", label: "Students" },
  { value: "students_and_parents", label: "Students and parents" },
];

/**
 * The design's upload sheet: name, week (from the chosen subject's scheme),
 * subject and class, who can see it, and the file. Upload is disabled until
 * the form is valid; progress is announced while the file uploads and the
 * resource saves, and a failure is shown in the sheet. Cancel aborts an
 * upload in flight.
 *
 * @param props - See {@link UploadResourceSheetProps}.
 * @returns The sheet.
 */
export function UploadResourceSheet({ open, onClose, cards, initialCourseId, initialWeek, termParam }: UploadResourceSheetProps) {
  const uploader = useResourceUploader();
  const maxBytes = useMemo(() => maxUploadBytes(), []);
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);
  const [week, setWeek] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ResourceVisibility>("students");
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState<{ name: string; visibility: ResourceVisibility; className: string; week: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const weekId = useId();
  const fileId = useId();
  const subjectLabelId = useId();
  const visibilityLabelId = useId();

  const card = cards.find((c) => c.course.id === courseId) ?? cards[0];
  const scheme = useScheme(open ? card?.course.id : undefined, termParam);
  const weeks = scheme.data?.course.id === card?.course.id ? (scheme.data?.weeks ?? []) : [];
  const chosenWeek = weeks.find((w) => w.week === week);

  // Opening starts a clean form on the page's subject.
  const { reset } = uploader;
  useEffect(() => {
    if (!open) return;
    reset();
    setCourseId(initialCourseId);
    setWeek(undefined);
    setName("");
    setVisibility("students");
    setFile(null);
    setDone(null);
  }, [open, initialCourseId, reset]);

  // The week defaults to the deep link's (for the page's subject), else this week, else week 1.
  useEffect(() => {
    if (week !== undefined || !scheme.data || scheme.data.course.id !== card?.course.id) return;
    const linked = card.course.id === initialCourseId && initialWeek && initialWeek <= scheme.data.totalWeeks ? initialWeek : undefined;
    setWeek(linked ?? scheme.data.currentWeek ?? scheme.data.weeks[0]?.week ?? 1);
  }, [week, scheme.data, card, initialCourseId, initialWeek]);

  const busy = uploader.phase === "uploading" || uploader.phase === "saving";
  const draft = { name, file, courseId: card?.course.id ?? "", classId: card?.class.id ?? "", termId: scheme.data?.term.id ?? "", week };
  const problem = validateUpload(draft, maxBytes);
  const missingBasics = !name.trim() || !file;
  const status = uploadStatusText(uploader.phase, uploader.progress);

  const close = () => {
    if (busy) uploader.cancel();
    onClose();
  };

  const pickCourse = (id: string) => {
    if (id === card?.course.id) return;
    setCourseId(id);
    setWeek(undefined);
  };

  const submit = async () => {
    if (problem || !file || !card || !week || busy) return;
    const ok = await uploader.submit({
      name,
      file,
      courseId: card.course.id,
      classId: card.class.id,
      termId: scheme.data?.term.id ?? "",
      week,
      visibility,
    });
    if (ok) setDone({ name: name.trim(), visibility, className: card.class.name, week });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && close()}
      eyebrowText="Resources"
      title={done ? "Uploaded" : "Upload a resource"}
      subtitle="Filed under the week you choose in the scheme of work. Students see it in their portal straight away."
      footer={
        done ? (
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={close}>
              Cancel
            </button>
            <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={() => void submit()} disabled={Boolean(problem) || busy}>
              {uploader.phase === "uploading" ? "Uploading…" : uploader.phase === "saving" ? "Saving…" : "Upload"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm leading-[1.7] text-tl-body">{uploadDoneNote(done.name, done.visibility, done.className, done.week)}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className={fieldLabel}>
              Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={uploadNamePlaceholder(chosenWeek?.topic, week)}
              maxLength={200}
              disabled={busy}
              className={fieldControl}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={weekId} className={fieldLabel}>
              Week
            </label>
            <div className="relative">
              <select
                id={weekId}
                value={week ?? ""}
                onChange={(event) => setWeek(Number(event.target.value) || undefined)}
                disabled={busy || weeks.length === 0}
                className={`${fieldControl} cursor-pointer appearance-none pr-10`}
              >
                {weeks.length === 0 ? <option value="">{scheme.isError ? "The weeks could not be loaded" : "Loading weeks…"}</option> : null}
                {weeks.map((w) => (
                  <option key={w.week} value={w.week}>
                    {uploadWeekLabel(w, scheme.data?.currentWeek ?? null)}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tl-muted" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div id={subjectLabelId} className={fieldLabel}>
              Subject and class
            </div>
            <div role="group" aria-labelledby={subjectLabelId} className="flex flex-wrap gap-2">
              {cards.map((c) => (
                <button key={c.course.id} type="button" aria-pressed={c.course.id === card?.course.id} onClick={() => pickCourse(c.course.id)} disabled={busy} className={chip(c.course.id === card?.course.id)}>
                  {subjectLabel(c)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div id={visibilityLabelId} className={fieldLabel}>
              Who can see it
            </div>
            <div role="group" aria-labelledby={visibilityLabelId} className="flex flex-wrap gap-2">
              {VISIBILITY.map((v) => (
                <button key={v.value} type="button" aria-pressed={visibility === v.value} onClick={() => setVisibility(v.value)} disabled={busy} className={chip(visibility === v.value)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor={fileId} className="sr-only">
            File to upload
          </label>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            accept={UPLOAD_ACCEPT}
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) setFile(next);
              event.target.value = "";
            }}
          />
          <SheetRow
            label={file ? file.name : "No file chosen"}
            description={file ? `Ready to upload · ${formatBytes(file.size)}` : `PDF, Word, slides, images or video up to ${megabytes(maxBytes)} MB`}
            action={
              <button type="button" className={rowButton} onClick={() => fileRef.current?.click()} disabled={busy}>
                {file ? "Change" : "Choose file"}
              </button>
            }
          />

          {missingBasics ? (
            <p className="text-[13px] text-tl-muted">Give it a name and choose a file to continue.</p>
          ) : problem ? (
            <p className="text-[13px] font-bold text-tl-danger">{problem}</p>
          ) : null}

          <div aria-live="polite" className={status ? "flex flex-col gap-1.5" : "sr-only"}>
            {status ? (
              <>
                <span className="text-[13px] font-bold text-tl-muted">{status}</span>
                <span
                  role="progressbar"
                  aria-label="Upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((uploader.phase === "saving" ? 1 : uploader.progress) * 100)}
                  className="block h-1.5 overflow-hidden rounded-[3px] bg-tl-track"
                >
                  <span className="block h-full rounded-[3px] bg-tl-brand-fill transition-[width]" style={{ width: `${Math.round((uploader.phase === "saving" ? 1 : uploader.progress) * 100)}%` }} />
                </span>
              </>
            ) : null}
          </div>

          {uploader.error ? (
            <p role="alert" className="rounded-2xl bg-tl-danger-bg px-4 py-3 text-[13px] font-bold text-tl-danger">
              {uploader.error}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
