"use client";
import React, { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { eyebrow, focusRing, ghostButton } from "@/components/tl/styles";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";
import { logger } from "@/lib/logger";
import { formatDate } from "./CurriculumCard";
import { paperClass } from "./richText";
import { sanitizeCurriculumHtml } from "./sanitizeHtml";
import { fileNameOf } from "./editor/types";

/** Props for {@link CurriculumDetailModal}. */
export interface CurriculumDetailModalProps {
  /** The curriculum to show; the dialog is closed when `null`. */
  curriculum: Curriculum | null;
  onClose: () => void;
}

/**
 * A curriculum in full, in the redesign's sheet (a bottom sheet on phones):
 * the facts, the text on a white page and the attachments, with "Download
 * image", which renders the page to a PNG. The text is cleaned with
 * `sanitizeCurriculumHtml` before it is inserted. Radix supplies the focus
 * trap, Escape and focus return.
 *
 * @param props - See {@link CurriculumDetailModalProps}.
 * @param props.curriculum - The curriculum to show, or `null` for closed.
 * @param props.onClose - Closes the dialog.
 * @returns The dialog element.
 */
const CurriculumDetailModal: React.FC<CurriculumDetailModalProps> = ({ curriculum, onClose }) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const safeContent = useMemo(() => sanitizeCurriculumHtml(curriculum?.content ?? ""), [curriculum?.content]);

  const handleDownload = async () => {
    if (!captureRef.current || !curriculum) return;
    setDownloading(true);
    try {
      // Loaded on demand: the library is large and most visits never download.
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(captureRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${courseTitle(curriculum, "curriculum")}.png`;
      link.click();
    } catch (error) {
      logger.error("curriculum", "generating the curriculum image failed", error);
      toast.error("Could not generate the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const course = curriculum ? courseOf(curriculum) : null;
  const attachments = curriculum?.attachments ?? [];
  const facts = curriculum
    ? [
        ["Term", termOf(curriculum)?.name || "Not recorded"],
        ["Class", course?.className],
        ["Teacher", teacherName(curriculum)],
        ["School", course?.schoolName],
        ["Updated", formatDate(curriculum.updatedAt)],
      ].filter((f): f is [string, string] => Boolean(f[1]))
    : [];

  return (
    <Dialog.Root open={Boolean(curriculum)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(15,27,46,0.45)]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] max-h-[90vh] overflow-y-auto rounded-t-[24px] bg-tl-surface p-[clamp(20px,3vw,30px)] text-tl-ink shadow-[0_30px_70px_-30px_rgba(15,27,46,0.45)] focus:outline-none sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[calc(100%-40px)] sm:max-w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] dark:border dark:border-tl-line">
          {curriculum ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={eyebrow}>Written curriculum</p>
                  <Dialog.Title className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-[-0.4px] text-tl-ink">{courseTitle(curriculum)}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-[13px] text-tl-muted">What students read for this subject and term.</Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-faint hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
                >
                  <X className="h-5 w-5" aria-hidden />
                </Dialog.Close>
              </div>

              <dl className="mt-4 grid gap-x-5 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">{label}</dt>
                    <dd className="mt-0.5 text-sm font-bold text-tl-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <div ref={captureRef} className="mt-4 rounded-2xl border border-tl-line-soft bg-white p-5">
                <p className="text-lg font-extrabold text-[#0F1B2E]">{courseTitle(curriculum)}</p>
                {safeContent ? (
                  <div className={`${paperClass} mt-2`} dangerouslySetInnerHTML={{ __html: safeContent }} />
                ) : (
                  <p className="mt-2 text-sm text-[#5B6B80]">No content added yet.</p>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-[15px] font-extrabold text-tl-ink">Attachments</h3>
                  <ul className="mt-1.5 flex flex-col">
                    {attachments.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex min-h-[44px] items-center rounded-md text-sm font-bold text-tl-link hover:underline ${focusRing}`}
                        >
                          {fileNameOf(url)}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-2.5">
                <button type="button" onClick={handleDownload} disabled={downloading} className={ghostButton}>
                  {downloading ? "Preparing…" : "Download image"}
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CurriculumDetailModal;
