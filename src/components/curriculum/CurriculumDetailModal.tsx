"use client";
import React, { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/CustomToast";
import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";
import { logger } from "@/lib/logger";
import { formatDate } from "./CurriculumCard";
import { sanitizeCurriculumHtml } from "./sanitizeHtml";
import { fileNameOf } from "./editor/types";

/** Props for {@link CurriculumDetailModal}. */
export interface CurriculumDetailModalProps {
  /** The curriculum to show; the modal is closed when `null`. */
  curriculum: Curriculum | null;
  onClose: () => void;
}

/** A labelled line of the summary; hidden when the API had no value. */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}

/**
 * A curriculum in full, in a modal: summary, content, attachments, and a
 * "Download Image" that renders the card to a PNG.
 *
 * The content is cleaned with `sanitizeCurriculumHtml` before it is inserted.
 * The modal is a Radix dialog, so it locks page scroll, traps focus and closes
 * on Escape.
 *
 * @param props - See {@link CurriculumDetailModalProps}.
 * @param props.curriculum - The curriculum to show, or `null` for closed.
 * @param props.onClose - Closes the modal.
 * @returns The modal element.
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

  return (
    <Dialog open={Boolean(curriculum)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-8">
        {curriculum && (
          <>
            <div ref={captureRef} className="bg-white text-[#6F6F6F]">
              <DialogTitle className="mb-2 text-2xl font-bold leading-normal text-[#030E18]">
                {courseTitle(curriculum)}
              </DialogTitle>
              <DialogDescription className="sr-only">Curriculum details for this course and term.</DialogDescription>
              <div className="mt-4 space-y-4">
                <Row label="Term" value={termOf(curriculum)?.name || "N/A"} />
                <Row label="Class" value={course?.className} />
                <Row label="Teacher" value={teacherName(curriculum)} />
                <Row label="School" value={course?.schoolName} />
                <Row label="Created" value={formatDate(curriculum.createdAt)} />
                <Row label="Updated" value={formatDate(curriculum.updatedAt)} />
                <div className="mt-4">
                  <p className="font-medium mb-2">Content:</p>
                  {safeContent ? (
                    <div className="prose max-w-none break-words text-[#6F6F6F] dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeContent }} />
                  ) : (
                    <p>No content added yet</p>
                  )}
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Attachments:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {attachments.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#003366] hover:underline">
                            {fileNameOf(url)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="bg-[#003366] text-white px-6 py-2 rounded-lg hover:bg-[#002244] transition-colors duration-200 shadow-none flex items-center gap-2 disabled:opacity-60"
              >
                <Download size={16} />
                {downloading ? "Preparing…" : "Download Image"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CurriculumDetailModal;
