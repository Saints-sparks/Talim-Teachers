import { courseOf, courseTitle, teacherName, termOf, type Curriculum } from "@/hooks/curriculum/types";
import { fileNameOf } from "./editor/types";

const MARGIN = 20;

/**
 * A date for the PDF's summary block.
 *
 * @param value - An ISO date from the API.
 * @returns The local date, or "N/A".
 */
function pdfDate(value: string | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

/**
 * The plain text of the curriculum's HTML, with block boundaries kept as line
 * breaks so lists and paragraphs do not run together in the PDF.
 *
 * @param html - HTML from the editor.
 * @returns Readable text.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Renders a curriculum to a PDF and saves it as `<course>.pdf`.
 *
 * `jspdf` is loaded on demand: it is large and most visits never download.
 *
 * @param curriculum - The curriculum to export.
 * @throws When the PDF cannot be generated.
 */
export async function downloadCurriculumPdf(curriculum: Curriculum): Promise<void> {
  const { default: JsPdf } = await import("jspdf");
  const pdf = new JsPdf("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const course = courseOf(curriculum);
  const title = courseTitle(curriculum, "Untitled Course");

  /** Starts a new page when the next block will not fit. */
  const ensureRoom = (height: number) => {
    if (y + height > pageHeight - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(3, 14, 24);
  pdf.text(title, MARGIN, y);
  y += 15;

  if (course?.courseCode) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 51, 102);
    pdf.text(`Course Code: ${course.courseCode}`, MARGIN, y);
    y += 10;
  }

  if (course?.description) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(11);
    pdf.setTextColor(111, 111, 111);
    const lines: string[] = pdf.splitTextToSize(course.description, contentWidth);
    pdf.text(lines, MARGIN, y);
    y += lines.length * 5 + 10;
  }

  pdf.setDrawColor(240, 240, 240);
  pdf.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 15;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(3, 14, 24);
  pdf.text("Course Information", MARGIN, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(135, 135, 135);
  const facts: Array<[string, string]> = [
    ["Term:", termOf(curriculum)?.name || "N/A"],
    ["Class:", course?.className || "N/A"],
    ["Teacher:", teacherName(curriculum) || "Unknown"],
    ["School:", course?.schoolName || "Unknown"],
    ["Created:", pdfDate(curriculum.createdAt)],
    ["Last Updated:", pdfDate(curriculum.updatedAt)],
  ];
  for (const [label, value] of facts) {
    pdf.text(`${label} ${value}`, MARGIN, y);
    y += 6;
  }
  y += 10;

  pdf.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 15;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(3, 14, 24);
  pdf.text("Curriculum Content", MARGIN, y);
  y += 10;

  const text = curriculum.content ? htmlToPlainText(curriculum.content) : "";
  if (text) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(3, 14, 24);
    const lines: string[] = pdf.splitTextToSize(text, contentWidth);
    // Write line by line so long content flows across pages instead of running off the first.
    for (const line of lines) {
      ensureRoom(5);
      pdf.text(line, MARGIN, y);
      y += 5;
    }
    y += 10;
  } else {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(11);
    pdf.setTextColor(135, 135, 135);
    pdf.text("No content available for this curriculum.", MARGIN, y);
    y += 10;
  }

  const attachments = curriculum.attachments ?? [];
  if (attachments.length > 0) {
    y += 10;
    ensureRoom(30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(3, 14, 24);
    pdf.text("Attachments", MARGIN, y);
    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 51, 102);
    attachments.forEach((url, index) => {
      ensureRoom(6);
      pdf.text(`• ${fileNameOf(url, `Attachment ${index + 1}`)}`, MARGIN, y);
      y += 6;
    });
  }

  const pageCount = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(135, 135, 135);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN - 20, pageHeight - 10);
  }

  pdf.save(`${courseTitle(curriculum, "curriculum")}.pdf`);
}
