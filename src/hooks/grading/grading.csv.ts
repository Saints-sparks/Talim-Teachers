/**
 * CSV export and import of scores on the redesigned Grading page, built on
 * the grading workspace's CSV code (`grade-csv.ts`): the same parser,
 * roster matching and file writer, fed from the Round 3 course sheet.
 *
 * An import never saves by itself: matched scores become unsaved cells the
 * teacher checks, then saves with Save draft.
 */
import { csvFileName, matchScoreRows, parseScoreCsv, toCsv } from "@/app/services/grading-workspace/grade-csv";
import type { ScoreFailure } from "@/app/services/grading-workspace/types";
import type { CourseGradingSheet, GradingAssessment } from "@/types/grading";
import { cellText, parseScore, positionLabel, tiedRanks, type AssessmentDraft, type LiveTotal } from "./grading.logic";

/** A file to hand the browser. */
export interface CsvFile {
  filename: string;
  csv: string;
}

/**
 * One assessment's scores as on screen (unsaved text included when it is a
 * valid score), with the columns the importer reads back.
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns The file.
 */
export function assessmentCsv(sheet: CourseGradingSheet, assessment: GradingAssessment, draft: AssessmentDraft | undefined): CsvFile {
  const rows = sheet.students.map((s) => {
    const parsed = parseScore(cellText(s.scores[assessment.id], draft?.[s.id]), assessment.maxScore);
    return [s.id, s.admissionNumber ?? "", s.name, parsed.kind === "valid" ? parsed.value : "", assessment.maxScore];
  });
  return {
    filename: csvFileName(sheet.course.title, sheet.class.name, assessment.name, sheet.term.name),
    csv: toCsv(["Student ID", "Admission number", "Student", "Score", "Max score"], rows),
  };
}

/**
 * The Term total: every assessment, the total, grade and position.
 *
 * @param sheet - The course sheet.
 * @param rows - From `liveTotals`.
 * @returns The file.
 */
export function termTotalCsv(sheet: CourseGradingSheet, rows: readonly LiveTotal[]): CsvFile {
  const tied = tiedRanks(rows.map((r) => r.position));
  const headers = [
    "Student ID",
    "Admission number",
    "Student",
    ...sheet.assessments.map((a) => `${a.name} (/${a.maxScore})`),
    `Total (/${sheet.totalMax})`,
    "Grade",
    "Position",
  ];
  const body = rows.map((r) => [
    r.student.id,
    r.student.admissionNumber ?? "",
    r.student.name,
    ...sheet.assessments.map((a) => r.values[a.id] ?? ""),
    r.total ?? "",
    r.grade ?? "",
    r.position ? positionLabel(r.position, tied.has(r.position.rank)) : "",
  ]);
  return { filename: csvFileName(sheet.course.title, sheet.class.name, "term total", sheet.term.name), csv: toCsv(headers, body) };
}

/** What an import did. */
export interface ScoreImport {
  /** The cells to lay over the sheet (unsaved). */
  draft: AssessmentDraft;
  /** How many scores were filled in. */
  filled: number;
  /** Rows that could not be used, with the reason. */
  problems: string[];
}

/**
 * Reads a score file into unsaved cells for one assessment. Rows are matched
 * by student id (or admission number) and else by name; a score out of
 * 0–max, a duplicate or an unknown student is reported, never filled in. A
 * "Max score" column in the file is ignored: the assessment's maximum is set
 * by the school.
 *
 * @param text - The file's text.
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @returns The cells and what went wrong.
 */
export function importScoresCsv(text: string, sheet: CourseGradingSheet, assessment: GradingAssessment): ScoreImport {
  const parsed = parseScoreCsv(text);
  const byAdmission = new Map(sheet.students.filter((s) => s.admissionNumber).map((s) => [s.admissionNumber as string, s.id]));
  const rows = parsed.rows.map((row) => ({
    ...row,
    // The exporter's first column is the id; a sheet from elsewhere may carry the admission number there.
    studentId: row.studentId && byAdmission.has(row.studentId) ? byAdmission.get(row.studentId) : row.studentId,
    maxScore: undefined,
  }));
  const roster = sheet.students.map((s) => ({ studentId: s.id, studentName: s.name, maxScore: assessment.maxScore }));
  const matched = matchScoreRows({ ...parsed, rows }, roster);
  const draft: AssessmentDraft = {};
  for (const s of matched.scores) if (s.score !== undefined && s.score !== null) draft[s.studentId] = String(s.score);
  const problems = [
    ...parsed.errors.map((e) => (e.line ? `Row ${e.line}: ${e.reason}` : e.reason)),
    ...matched.failures.map((f: ScoreFailure) => f.reason),
  ];
  return { draft, filled: Object.keys(draft).length, problems };
}
