/**
 * CSV for the grading workspace: reading a teacher's score sheet, and writing
 * the grades on screen back out as a file.
 *
 * The API accepts JSON only — `GET /grade-records/grading/batch-upload/capability`
 * says as much ("CSV file upload parser is not enabled yet; use JSON payload
 * for now"). So the browser parses the file, matches each row to a student on
 * the class roster, and posts `SaveAssessmentScoresDto`. Rows that cannot be
 * matched never reach the server: the teacher sees them, by name, first.
 *
 * Export is the same idea in reverse. No export endpoint exists anywhere in
 * the API, and the grade table already holds the complete roster for the
 * assessment, so the file is built here from what the teacher is looking at.
 */

import type { AssessmentScorePayload, ScoreFailure } from "./types";

/** One row read out of a score CSV, before it is matched to a student. */
export interface ParsedScoreRow {
  /** 1-based line number in the file, for error messages the teacher can act on. */
  line: number;
  /** Student id column, when the sheet carries one. */
  studentId?: string;
  /** Student name column, used when there is no id. */
  studentName?: string;
  /** The score as written; `null` when the cell was empty or not a number. */
  score: number | null;
  /** Per-row max, when the sheet overrides the assessment's. */
  maxScore?: number;
}

/** A row the file itself got wrong (bad number, missing identity). */
export interface CsvRowError {
  line: number;
  reason: string;
}

/** What {@link parseScoreCsv} makes of a file. */
export interface ParsedScoreCsv {
  /** Column headers as they appeared, lower-cased and trimmed. */
  headers: string[];
  /** Rows that parsed into a usable shape. */
  rows: ParsedScoreRow[];
  /** Rows that did not. */
  errors: CsvRowError[];
}

/** A roster entry {@link matchScoreRows} can match a CSV row against. */
export interface RosterEntry {
  studentId: string;
  studentName: string;
  /** The max score to send when the sheet does not carry one. */
  maxScore: number;
}

/** The outcome of matching a parsed file against the class roster. */
export interface MatchedScores {
  /** Rows ready to send, in roster order. */
  scores: AssessmentScorePayload[];
  /** Rows that could not be matched or were out of range. */
  failures: ScoreFailure[];
  /** Students on the roster the file said nothing about. */
  missing: RosterEntry[];
}

/** Header spellings accepted for each column the parser understands. */
const COLUMN_ALIASES: Record<"studentId" | "studentName" | "score" | "maxScore", string[]> = {
  studentId: ["studentid", "student id", "student_id", "id", "admission number", "admissionnumber"],
  studentName: ["studentname", "student name", "student", "name", "full name", "fullname"],
  score: ["score", "actualscore", "actual score", "mark", "marks", "result"],
  maxScore: ["maxscore", "max score", "max", "total", "out of", "outof"],
};

/**
 * Splits one CSV line, honouring double-quoted fields and `""` escapes.
 *
 * @param line - A single line of the file, without its line ending.
 * @returns The cells, in order, unquoted and trimmed.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "," || char === ";" || char === "\t") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Finds which column holds which field, by header name.
 *
 * @param headers - The lower-cased header row.
 * @returns Column index per field, or -1 when the file has no such column.
 */
function mapColumns(headers: string[]): Record<keyof typeof COLUMN_ALIASES, number> {
  const find = (aliases: string[]): number => headers.findIndex((header) => aliases.includes(header));
  return {
    studentId: find(COLUMN_ALIASES.studentId),
    studentName: find(COLUMN_ALIASES.studentName),
    score: find(COLUMN_ALIASES.score),
    maxScore: find(COLUMN_ALIASES.maxScore),
  };
}

/**
 * Reads a number out of a cell.
 *
 * @param cell - The raw cell text.
 * @returns The number, or `null` when the cell is empty or not numeric.
 */
function toNumber(cell: string | undefined): number | null {
  if (cell === undefined) return null;
  const trimmed = cell.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parses a score sheet. The file needs a header row naming a score column and
 * at least one of a student id or a student name column; everything else is
 * ignored, so a sheet exported from anywhere else still works.
 *
 * @param text - The whole file as text.
 * @returns The rows it could read and the lines it could not.
 */
export function parseScoreCsv(text: string): ParsedScoreCsv {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ line: 0, reason: "The file is empty." }] };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const columns = mapColumns(headers);

  if (columns.score < 0) {
    return {
      headers,
      rows: [],
      errors: [{ line: 1, reason: "No score column. Add a column headed “Score”." }],
    };
  }
  if (columns.studentId < 0 && columns.studentName < 0) {
    return {
      headers,
      rows: [],
      errors: [{ line: 1, reason: "No student column. Add a column headed “Student ID” or “Student”." }],
    };
  }

  const rows: ParsedScoreRow[] = [];
  const errors: CsvRowError[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = index + 1;
    const cells = splitCsvLine(lines[index]);
    const studentId = columns.studentId >= 0 ? cells[columns.studentId]?.trim() : undefined;
    const studentName = columns.studentName >= 0 ? cells[columns.studentName]?.trim() : undefined;

    if (!studentId && !studentName) {
      errors.push({ line, reason: "No student on this row." });
      continue;
    }

    const rawScore = columns.score >= 0 ? cells[columns.score] : undefined;
    const score = toNumber(rawScore);
    if (score === null && (rawScore ?? "").trim() !== "") {
      errors.push({ line, reason: `“${rawScore}” is not a number.` });
      continue;
    }

    const maxScore = columns.maxScore >= 0 ? toNumber(cells[columns.maxScore]) : null;
    rows.push({
      line,
      studentId: studentId || undefined,
      studentName: studentName || undefined,
      score,
      maxScore: maxScore ?? undefined,
    });
  }

  return { headers, rows, errors };
}

/**
 * Normalises a name so “Ada  Bello” and “ada bello” match.
 *
 * @param value - Any name-ish string.
 * @returns The comparison form.
 */
function normaliseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Matches parsed rows to the class roster and validates each score against the
 * max it will be saved with. Nothing that fails here is sent to the server.
 *
 * @param parsed - The output of {@link parseScoreCsv}.
 * @param roster - The students of the class being graded.
 * @returns Scores ready to post, rows that failed, and students not mentioned.
 */
export function matchScoreRows(parsed: ParsedScoreCsv, roster: RosterEntry[]): MatchedScores {
  const byId = new Map(roster.map((entry) => [entry.studentId, entry]));
  const byName = new Map<string, RosterEntry[]>();
  for (const entry of roster) {
    const key = normaliseName(entry.studentName);
    byName.set(key, [...(byName.get(key) ?? []), entry]);
  }

  const scores: AssessmentScorePayload[] = [];
  const failures: ScoreFailure[] = [];
  const seen = new Set<string>();

  for (const row of parsed.rows) {
    const label = row.studentName || row.studentId || `Row ${row.line}`;

    let entry = row.studentId ? byId.get(row.studentId) : undefined;
    if (!entry && row.studentName) {
      const candidates = byName.get(normaliseName(row.studentName)) ?? [];
      if (candidates.length > 1) {
        failures.push({
          studentId: row.studentId ?? "",
          studentName: label,
          reason: `Row ${row.line}: more than one student in this class is called “${row.studentName}”. Use the Student ID column.`,
        });
        continue;
      }
      entry = candidates[0];
    }

    if (!entry) {
      failures.push({
        studentId: row.studentId ?? "",
        studentName: label,
        reason: `Row ${row.line}: no student in this class matches “${label}”.`,
      });
      continue;
    }

    if (seen.has(entry.studentId)) {
      failures.push({
        studentId: entry.studentId,
        studentName: entry.studentName,
        reason: `Row ${row.line}: ${entry.studentName} appears more than once in the file.`,
      });
      continue;
    }

    if (row.score === null) {
      // An empty score cell means "leave this student alone", not an error.
      seen.add(entry.studentId);
      continue;
    }

    const maxScore = row.maxScore ?? entry.maxScore;
    if (!(maxScore > 0)) {
      failures.push({
        studentId: entry.studentId,
        studentName: entry.studentName,
        reason: `Row ${row.line}: the maximum score must be greater than 0.`,
      });
      continue;
    }
    if (row.score < 0 || row.score > maxScore) {
      failures.push({
        studentId: entry.studentId,
        studentName: entry.studentName,
        reason: `Row ${row.line}: ${row.score} is outside 0–${maxScore}.`,
      });
      continue;
    }

    seen.add(entry.studentId);
    scores.push({ studentId: entry.studentId, score: row.score, maxScore });
  }

  return {
    scores,
    failures,
    missing: roster.filter((entry) => !seen.has(entry.studentId)),
  };
}

/**
 * Turns the server's one-line bulk rejection back into per-student failures.
 *
 * `bulkCreateAssessmentGradeRecords` validates the whole batch and throws a
 * single message — `Validation failed: Grade 1: …; Grade 3: …` — where the
 * number is the 1-based position in the array that was sent. Splitting it
 * back out is the difference between "saving failed" and "Ada Bello already
 * has a score for this assessment".
 *
 * @param message - The message from the thrown `ApiError`.
 * @param sent - The scores that were posted, in the order they were sent.
 * @param nameOf - Resolves a student id to the name to show.
 * @returns One failure per row the server named, or none if it named no rows.
 */
export function parseBulkRowFailures(
  message: string,
  sent: AssessmentScorePayload[],
  nameOf: (studentId: string) => string | undefined,
): ScoreFailure[] {
  const failures: ScoreFailure[] = [];
  const pattern = /Grade (\d+):\s*([^;]+)/g;
  let match = pattern.exec(message);

  while (match !== null) {
    const position = Number(match[1]) - 1;
    const row = sent[position];
    if (row) {
      failures.push({
        studentId: row.studentId,
        studentName: nameOf(row.studentId),
        reason: match[2].trim(),
      });
    }
    match = pattern.exec(message);
  }

  return failures;
}

/**
 * Renders rows as CSV, quoting any cell that needs it.
 *
 * @param headers - The header row.
 * @param rows - Cell values per row, in the same order as the headers.
 * @returns The file contents.
 */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/**
 * Hands the browser a CSV file to save. A no-op outside the browser.
 *
 * @param filename - Suggested file name, with its extension.
 * @param csv - The file contents, from {@link toCsv}.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  // The BOM is what makes Excel open UTF-8 names correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * A file name safe on every platform, e.g. `grades-maths-first-term.csv`.
 *
 * @param parts - The words to join; empty ones are dropped.
 * @returns The file name, ending in `.csv`.
 */
export function csvFileName(...parts: Array<string | undefined>): string {
  const slug = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "grades"}.csv`;
}
