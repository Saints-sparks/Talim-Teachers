/**
 * Pure logic for the redesigned Subjects page: the wording and numbers of the
 * subject cards, the scheme-of-work rows and the resources list, and the
 * deep-link parameters (`/subjects?courseId=&tab=plan|resources&week=`).
 * No React; the design's copy is quoted from `Talim Teacher Portal.dc.html`
 * ("// SUBJECTS", ~1862–1898).
 */
import type { CourseResource, ResourceKind, ResourceRef, ResourceVisibility, SchemeWeek, SubjectCard } from "@/types/subjects";

/** The two tabs of the subject detail. */
export type SubjectTab = "plan" | "resources";

/** Highest week a scheme of work can have (§6: week is 1..30). */
export const MAX_SCHEME_WEEK = 30;

/**
 * "1 lesson a week" / "6 lessons a week".
 *
 * @param n - Lessons a week, from the timetable.
 * @returns The phrase.
 */
export function lessonsAWeek(n: number): string {
  return `${n} ${n === 1 ? "lesson" : "lessons"} a week`;
}

/**
 * The card's progress line: "2 of 12 weeks taught".
 *
 * @param taught - Weeks marked taught.
 * @param totalWeeks - Weeks in the term (never assume 12).
 * @returns The line.
 */
export function weeksTaughtText(taught: number, totalWeeks: number): string {
  return `${taught} of ${totalWeeks} ${totalWeeks === 1 ? "week" : "weeks"} taught`;
}

/**
 * How full the card's progress bar is.
 *
 * @param taught - Weeks marked taught.
 * @param totalWeeks - Weeks in the term.
 * @returns A whole percentage, 0 to 100 (0 when the term has no weeks).
 */
export function taughtPercent(taught: number, totalWeeks: number): number {
  if (!(totalWeeks > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((taught / totalWeeks) * 100)));
}

/**
 * The card's meta line: "JSS1 A · 6 lessons a week".
 *
 * @param card - The subject card.
 * @returns The line.
 */
export function cardMeta(card: Pick<SubjectCard, "class" | "lessonsPerWeek">): string {
  return `${card.class.name} · ${lessonsAWeek(card.lessonsPerWeek)}`;
}

/**
 * "Mathematics · JSS1 A": the detail title, the edit sheet's eyebrow and the
 * upload sheet's subject chips.
 *
 * @param card - The subject card.
 * @returns The label.
 */
export function subjectLabel(card: Pick<SubjectCard, "course" | "class">): string {
  return `${card.course.title} · ${card.class.name}`;
}

/**
 * The detail's meta line: "MTH111 · 12 students · 6 lessons a week · week 3
 * of 12 now", without the last part outside the term.
 *
 * @param card - The subject card.
 * @param scheme - The loaded scheme's week numbers, which win over the card's.
 * @param scheme.currentWeek - The scheme's current week.
 * @param scheme.totalWeeks - The scheme's number of weeks.
 * @returns The line.
 */
export function detailMeta(
  card: Pick<SubjectCard, "course" | "studentCount" | "lessonsPerWeek" | "currentWeek" | "totalWeeks">,
  scheme?: { currentWeek: number | null; totalWeeks: number },
): string {
  const current = scheme ? scheme.currentWeek : card.currentWeek;
  const total = scheme ? scheme.totalWeeks : card.totalWeeks;
  const parts = [card.course.code, `${card.studentCount} ${card.studentCount === 1 ? "student" : "students"}`, lessonsAWeek(card.lessonsPerWeek)];
  if (current !== null && current !== undefined) parts.push(`week ${current} of ${total} now`);
  return parts.join(" · ");
}

/** A week's tag in the plan. */
export interface WeekTag {
  label: "Taught" | "This week" | "Planned";
  tone: "success" | "info" | "muted";
}

/**
 * The tag on a week row: Taught wins over This week, anything else is Planned.
 *
 * @param week - The week.
 * @param currentWeek - The term's current week, or null outside the term.
 * @returns Label and tone.
 */
export function weekTag(week: Pick<SchemeWeek, "week" | "taughtAt">, currentWeek: number | null): WeekTag {
  if (week.taughtAt) return { label: "Taught", tone: "success" };
  if (currentWeek !== null && week.week === currentWeek) return { label: "This week", tone: "info" };
  return { label: "Planned", tone: "muted" };
}

/**
 * Whether a week can be marked taught (or undone): only weeks up to the
 * current one, and none outside the term.
 *
 * @param week - The week number.
 * @param currentWeek - The term's current week, or null.
 * @returns True when the toggle shows.
 */
export function canMarkWeek(week: number, currentWeek: number | null): boolean {
  return currentWeek !== null && week <= currentWeek;
}

/**
 * The toast after the taught toggle.
 *
 * @param week - The week.
 * @param taught - Whether it is now taught.
 * @returns "Week 3 marked as taught." or "Marked as not taught."
 */
export function taughtToast(week: number, taught: boolean): string {
  return taught ? `Week ${week} marked as taught.` : "Marked as not taught.";
}

/**
 * "1 resource shared" / "3 resources shared".
 *
 * @param n - Resources filed under the week.
 * @returns The phrase.
 */
export function resourcesSharedText(n: number): string {
  return `${n} ${n === 1 ? "resource" : "resources"} shared`;
}

/**
 * "1 view" / "11 views".
 *
 * @param n - Unique viewers.
 * @returns The phrase.
 */
export function viewsText(n: number): string {
  return `${n} ${n === 1 ? "view" : "views"}`;
}

/**
 * A file size the way people say it: "420 KB", "2.1 MB", "38 MB".
 *
 * @param bytes - The size.
 * @returns The label, or an empty string when unknown.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  // Whole numbers for KB and from 10 up; one decimal below 10 MB/GB ("2.1 MB", not "2.0 MB").
  const text = unit === 0 || value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
  return `${text} ${units[unit]}`;
}

/**
 * Who can see a resource, in words.
 *
 * @param visibility - The stored visibility; students when missing (§24's default).
 * @returns "Students" or "Students and parents".
 */
export function visibilityLabel(visibility: ResourceVisibility | null | undefined): string {
  return visibility === "students_and_parents" ? "Students and parents" : "Students";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A short date: "8 Sep", with the year when it is not this year.
 *
 * @param value - An ISO date or date-time.
 * @param now - Today, for the year (epoch ms).
 * @returns The label, or an empty string when unreadable.
 */
export function shortDate(value: string | null | undefined, now: number = Date.now()): string {
  if (!value) return "";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date(now).getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/**
 * A resource row's meta line: "Week 1 · 420 KB · 8 Sep · Students and
 * parents". Parts the resource does not have are left out.
 *
 * @param resource - The resource.
 * @param now - Today (epoch ms), for the date's year.
 * @returns The line.
 */
export function resourceMeta(resource: Pick<CourseResource, "week" | "sizeBytes" | "uploadDate" | "createdAt" | "visibility">, now: number = Date.now()): string {
  return [
    resource.week ? `Week ${resource.week}` : "",
    formatBytes(resource.sizeBytes),
    shortDate(resource.uploadDate ?? resource.createdAt, now),
    visibilityLabel(resource.visibility),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The kind chip on a resource row. */
export interface KindChip {
  label: "PDF" | "Slides" | "Video" | "Doc" | "Image" | "File";
  /** Colour meaning; the component maps it onto `tl-*` classes. */
  tone: "danger" | "warning" | "accent" | "info" | "success" | "muted";
}

const KIND_CHIPS: Record<ResourceKind, KindChip> = {
  pdf: { label: "PDF", tone: "danger" },
  slides: { label: "Slides", tone: "warning" },
  video: { label: "Video", tone: "accent" },
  doc: { label: "Doc", tone: "info" },
  image: { label: "Image", tone: "success" },
  other: { label: "File", tone: "muted" },
};

/**
 * The kind of a file from its MIME type or, failing that, its name.
 *
 * @param mimeType - The MIME type, if known.
 * @param name - A file name or URL, for the extension.
 * @returns The kind (`other` when neither says).
 */
export function kindFromFile(mimeType: string | null | undefined, name?: string | null): ResourceKind {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (/presentation|powerpoint|keynote/.test(mime)) return "slides";
  if (/msword|wordprocessing|opendocument\.text|rtf|^text\//.test(mime)) return "doc";
  const ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(name ?? "")?.[1]?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return "slides";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return "video";
  if (["doc", "docx", "odt", "rtf", "txt"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "svg"].includes(ext)) return "image";
  return "other";
}

/**
 * The chip for a resource: its kind. The server always answers one (a
 * resource saved before §24 gets one derived from its MIME type or file);
 * a kind this app does not know shows as "File".
 *
 * @param resource - The resource.
 * @returns Label and tone.
 */
export function kindChip(resource: Pick<CourseResource, "kind">): KindChip {
  return KIND_CHIPS[resource.kind] ?? KIND_CHIPS.other;
}

/**
 * The id of a populated-or-bare reference (`ref._id ?? ref`): resource reads
 * populate `classId`, `courseId`, `termId` and `uploadedBy`, the create
 * response does not.
 *
 * @param ref - A bare id, a populated object, or nothing.
 * @returns The id, or an empty string.
 */
export function refId(ref: ResourceRef): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : (ref._id ?? ref.id ?? "");
}

/**
 * The resources of one term. A resource without a term (saved before terms
 * were recorded) stays in every term.
 *
 * @param resources - The course's resources, any term.
 * @param termId - The page's term, once known.
 * @returns The resources to list.
 */
export function resourcesForTerm<T extends Pick<CourseResource, "termId">>(resources: readonly T[], termId: string | undefined): T[] {
  if (!termId) return [...resources];
  return resources.filter((r) => {
    const id = refId(r.termId);
    return !id || id === termId;
  });
}

/**
 * The link a resource row opens.
 *
 * @param resource - The resource.
 * @returns Its first file, else its image, else null.
 */
export function resourceHref(resource: Pick<CourseResource, "files" | "image">): string | null {
  return resource.files?.find(Boolean) ?? resource.image ?? null;
}

/**
 * The week options of the upload sheet: "Week 3 · Fractions: types and
 * equivalence (this week)".
 *
 * @param week - The week.
 * @param currentWeek - The term's current week, or null.
 * @returns The option label.
 */
export function uploadWeekLabel(week: Pick<SchemeWeek, "week" | "topic">, currentWeek: number | null): string {
  const topic = week.topic.trim();
  return `Week ${week.week}${topic ? ` · ${topic}` : ""}${week.week === currentWeek ? " (this week)" : ""}`;
}

/**
 * The upload sheet's name placeholder: "e.g. Fractions: types and equivalence worksheet".
 *
 * @param topic - The chosen week's topic.
 * @param week - The chosen week, when there is no topic.
 * @returns The placeholder.
 */
export function uploadNamePlaceholder(topic: string | undefined, week: number | undefined): string {
  const t = (topic ?? "").trim();
  if (t) return `e.g. ${t} worksheet`;
  return week ? `e.g. Week ${week} worksheet` : "e.g. Class worksheet";
}

/**
 * The upload sheet's done note.
 *
 * @param name - The resource name.
 * @param visibility - Who can see it.
 * @param className - The class.
 * @param week - The week it is filed under.
 * @returns "“Place value worksheet” is now available to students in JSS1 A, filed under week 1."
 */
export function uploadDoneNote(name: string, visibility: ResourceVisibility, className: string, week: number): string {
  return `“${name.trim()}” is now available to ${visibilityLabel(visibility).toLowerCase()} in ${className}, filed under week ${week}.`;
}

/** The deep-link parameters of `/subjects`, validated. */
export interface SubjectsParams {
  courseId?: string;
  tab?: SubjectTab;
  week?: number;
}

/**
 * Reads `?courseId=&tab=plan|resources&week=`. Anything unrecognised is
 * dropped rather than trusted.
 *
 * @param params - The raw values (from `useSearchParams`).
 * @param params.courseId - The course to open.
 * @param params.tab - `plan` or `resources`.
 * @param params.week - 1 to {@link MAX_SCHEME_WEEK}.
 * @returns The valid parameters.
 */
export function parseSubjectsParams(params: { courseId?: string | null; tab?: string | null; week?: string | null }): SubjectsParams {
  const out: SubjectsParams = {};
  const courseId = params.courseId?.trim();
  if (courseId) out.courseId = courseId;
  if (params.tab === "plan" || params.tab === "resources") out.tab = params.tab;
  if (params.week && /^\d{1,2}$/.test(params.week.trim())) {
    const week = Number(params.week.trim());
    if (week >= 1 && week <= MAX_SCHEME_WEEK) out.week = week;
  }
  return out;
}

/**
 * The address the page keeps in step with what is open.
 *
 * @param state - The open course and tab.
 * @param state.courseId - The open course.
 * @param state.tab - The open tab.
 * @returns `/subjects?courseId=…&tab=…`.
 */
export function subjectsHref({ courseId, tab }: { courseId?: string; tab: SubjectTab }): string {
  const search = new URLSearchParams();
  if (courseId) search.set("courseId", courseId);
  search.set("tab", tab);
  return `/subjects?${search.toString()}`;
}
