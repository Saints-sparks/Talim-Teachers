/**
 * Pure logic behind Settings → Help → Support, the v1.5 ticket system
 * (`talimBE-V2/docs/v1.5-platform-sync.md` §1): which desks a role may raise
 * a ticket to, the new-ticket and reply checks, the status, area and desk
 * labels, the 7-day reopen window, the words for a 409, the attachment picks
 * and the "Updated 2 hours ago" stamps. No React and no network, so all of it
 * is unit-tested in `src/__tests__/support.logic.test.ts`.
 *
 * Teachers and the school sub-admins who sign in here are school staff: they
 * raise tickets to the Talim desk only. The student and parent rules are
 * kept so the checks match the other apps' word for word.
 */
import { validateFile } from "@/components/chat-kit/mediaTypes";
import { ApiError } from "@/lib/apiError";
import {
  TICKET_BODY_MAX,
  TICKET_BODY_MIN,
  TICKET_CONTEXT_LIMITS,
  TICKET_REOPEN_WINDOW_DAYS,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
  type Attachment,
  type CreateTicketPayload,
  type Ticket,
  type TicketArea,
  type TicketContext,
  type TicketDesk,
  type TicketMessage,
  type TicketStatus,
  type TicketSummary,
} from "@/types/tickets";

/** Most files one ticket message carries (Talim Admin's `MAX_ATTACHMENTS`, the API's cap). */
export const MAX_TICKET_ATTACHMENTS = 5;

/** Tickets per page of `GET /tickets/mine`. */
export const TICKETS_PAGE_SIZE = 20;

/** How long a resolved ticket can be reopened, in milliseconds. */
export const REOPEN_WINDOW_MS = TICKET_REOPEN_WINDOW_DAYS * 24 * 60 * 60_000;

// ─── Where the tickets live ─────────────────────────────────────────────────

/**
 * The URL of Settings → Help → Support, optionally with one ticket's thread
 * open. A support notification (`{ page: 'support', ticketId }`) leads here.
 *
 * @param ticketId - The ticket to open, if any.
 * @returns `/settings?tab=help`, or `/settings?tab=help&ticket=<id>`.
 */
export function supportHref(ticketId?: string | null): string {
  const id = ticketId?.trim();
  return id ? `/settings?tab=help&ticket=${encodeURIComponent(id)}` : "/settings?tab=help";
}

/**
 * Reads `?ticket=` (a ticket id from a deep link).
 *
 * @param raw - The query value.
 * @returns The id, or null when missing or blank.
 */
export function parseTicketParam(raw: string | null | undefined): string | null {
  const id = (raw ?? "").trim();
  return id ? id : null;
}

// ─── Desks ──────────────────────────────────────────────────────────────────

/** Roles that may pick either desk (§1: students and parents). */
const LEARNER_ROLES: ReadonlySet<string> = new Set(["student", "parent"]);

/**
 * The desks a role may raise a ticket to (§1 `POST /tickets`).
 *
 * @param role - The signed-in user's role.
 * @returns `['school', 'talim']` for students and parents; `['talim']` for
 *   teachers and every other staff role (and for an unknown role).
 */
export function allowedDesks(role: string | null | undefined): readonly TicketDesk[] {
  return LEARNER_ROLES.has(String(role ?? "")) ? ["school", "talim"] : ["talim"];
}

/**
 * A desk as the screens name it.
 *
 * @param desk - The desk.
 * @param schoolName - The school's (or the child's school's) name, when known.
 * @returns "Talim support", "My school" or e.g. "My school · Easy Sparks".
 */
export function deskLabel(desk: TicketDesk, schoolName?: string | null): string {
  if (desk === "talim") return "Talim support";
  const name = schoolName?.trim();
  return name ? `My school · ${name}` : "My school";
}

// ─── Areas ──────────────────────────────────────────────────────────────────

/** What a ticket is about, as the chips and rows say it. */
export const TICKET_AREA_LABELS: Readonly<Record<TicketArea, string>> = {
  grading: "Grading",
  attendance: "Attendance",
  timetable: "Timetable",
  messages: "Messages",
  signing_in: "Signing in",
  payments: "Payments",
  fees: "Fees",
  results: "Results",
  transport: "Transport",
  behaviour: "Behaviour",
  other: "Something else",
};

/**
 * An area's label.
 *
 * @param area - The area.
 * @returns e.g. "Signing in"; "Something else" for `other` or an unknown value.
 */
export function areaLabel(area: TicketArea): string {
  return TICKET_AREA_LABELS[area] ?? TICKET_AREA_LABELS.other;
}

const TEACHER_AREAS: readonly TicketArea[] = ["grading", "attendance", "timetable", "messages", "results", "signing_in", "other"];
const STUDENT_AREAS: readonly TicketArea[] = ["results", "attendance", "timetable", "messages", "signing_in", "fees", "transport", "behaviour", "other"];
const PARENT_AREAS: readonly TicketArea[] = ["payments", "fees", "results", "attendance", "timetable", "messages", "transport", "behaviour", "signing_in", "other"];

/**
 * The area chips a role is offered, in order; always ending with `other`.
 *
 * @param role - The signed-in user's role.
 * @returns The students' or parents' list for those roles, else the teachers'.
 */
export function ticketAreasFor(role: string | null | undefined): readonly TicketArea[] {
  if (role === "student") return STUDENT_AREAS;
  if (role === "parent") return PARENT_AREAS;
  return TEACHER_AREAS;
}

// ─── Status ─────────────────────────────────────────────────────────────────

/** A chip's colour, as `pillTone` in `src/components/tl/styles.ts` names them. */
export type TicketTone = "info" | "accent" | "warning" | "success" | "muted";

/** A status chip's text and colour. */
export interface TicketStatusChip {
  label: string;
  tone: TicketTone;
}

const STATUS_CHIPS: Readonly<Record<TicketStatus, TicketStatusChip>> = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In progress", tone: "accent" },
  waiting_on_user: { label: "Waiting on you", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "muted" },
};

/**
 * A ticket status's chip.
 *
 * @param status - The status.
 * @returns Label and tone; an unknown status reads as "Open".
 */
export function statusChip(status: TicketStatus): TicketStatusChip {
  return STATUS_CHIPS[status] ?? STATUS_CHIPS.open;
}

// ─── New ticket and reply checks ────────────────────────────────────────────

/** What the new-ticket sheet holds before it is sent. */
export interface NewTicketDraft {
  desk: TicketDesk | null;
  area: TicketArea | null;
  subject: string;
  body: string;
  /** The files picked (only their number is checked). */
  attachments?: readonly unknown[];
  /** A parent's child; not used by staff. */
  childId?: string | null;
}

/** A field of the new-ticket sheet that can carry an error. */
export type NewTicketField = "desk" | "area" | "subject" | "body" | "attachments" | "childId";

/** One message per field that needs attention. */
export type NewTicketErrors = Partial<Record<NewTicketField, string>>;

/**
 * The message for a message body outside 1..5000 characters.
 *
 * @param body - The text typed.
 * @returns The message, or null when it can be sent.
 */
function bodyError(body: string): string | null {
  const length = body.trim().length;
  if (length < TICKET_BODY_MIN) return "Write a message";
  if (length > TICKET_BODY_MAX) return `Keep the message to ${TICKET_BODY_MAX.toLocaleString("en-GB")} characters or fewer`;
  return null;
}

/**
 * The message for too many files.
 *
 * @param attachments - The files picked.
 * @returns The message, or null within the cap.
 */
function attachmentsError(attachments: readonly unknown[] | undefined): string | null {
  return (attachments?.length ?? 0) > MAX_TICKET_ATTACHMENTS ? `Attach up to ${MAX_TICKET_ATTACHMENTS} files` : null;
}

/**
 * Checks a new ticket before it is sent (§1 `POST /tickets`).
 *
 * @param draft - What the sheet holds.
 * @param role - The signed-in user's role (decides the desks, and whether a child is needed).
 * @returns One message per field that needs attention; empty when it can be sent.
 */
export function validateNewTicket(draft: NewTicketDraft, role: string | null | undefined): NewTicketErrors {
  const errors: NewTicketErrors = {};
  const desks = allowedDesks(role);
  if (!draft.desk) errors.desk = "Choose who should get this ticket";
  else if (!desks.includes(draft.desk)) errors.desk = desks.length === 1 ? "Your tickets go to the Talim support team" : "Choose who should get this ticket";
  if (!draft.area) errors.area = "Choose what it is about";
  const subject = draft.subject.trim().length;
  if (subject < TICKET_SUBJECT_MIN) errors.subject = `Write a subject of at least ${TICKET_SUBJECT_MIN} characters`;
  else if (subject > TICKET_SUBJECT_MAX) errors.subject = `Keep the subject to ${TICKET_SUBJECT_MAX} characters or fewer`;
  const body = bodyError(draft.body);
  if (body) errors.body = body;
  const files = attachmentsError(draft.attachments);
  if (files) errors.attachments = files;
  if (role === "parent" && !draft.childId) errors.childId = "Choose which child this is about";
  return errors;
}

/**
 * Checks a reply before it is sent (§1 `POST /tickets/:id/messages`).
 *
 * @param body - The text typed.
 * @param attachments - The files picked.
 * @returns `{ body?, attachments? }` messages; empty when it can be sent.
 */
export function validateReply(body: string, attachments?: readonly unknown[]): Pick<NewTicketErrors, "body" | "attachments"> {
  const errors: Pick<NewTicketErrors, "body" | "attachments"> = {};
  const text = bodyError(body);
  if (text) errors.body = text;
  const files = attachmentsError(attachments);
  if (files) errors.attachments = files;
  return errors;
}

/**
 * Whether a set of errors holds any.
 *
 * @param errors - From {@link validateNewTicket} or {@link validateReply}.
 * @returns True when at least one field has a message.
 */
export function hasErrors(errors: NewTicketErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/**
 * Where the user is, for desk staff (`context` on `POST /tickets`): the page,
 * this app's version and the browser, each cut to the length the API takes.
 *
 * @param appVersion - This app's version.
 * @param where - The page and user agent; read from `window` when left out.
 * @param where.path - The page, e.g. `/settings`.
 * @param where.userAgent - The browser's user agent.
 * @returns The context, with only the values that are known.
 */
export function ticketContext(appVersion: string, where?: { path?: string | null; userAgent?: string | null }): TicketContext {
  const path = where ? where.path : typeof window === "undefined" ? null : `${window.location.pathname}${window.location.search}`;
  const userAgent = where ? where.userAgent : typeof navigator === "undefined" ? null : navigator.userAgent;
  const context: TicketContext = {};
  if (path) context.path = path.slice(0, TICKET_CONTEXT_LIMITS.path);
  if (appVersion) context.appVersion = appVersion.slice(0, TICKET_CONTEXT_LIMITS.appVersion);
  if (userAgent) context.userAgent = userAgent.slice(0, TICKET_CONTEXT_LIMITS.userAgent);
  return context;
}

/**
 * The `POST /tickets` body for a checked draft: trimmed text, the uploaded
 * files only when there are some, the child only for a parent, and where the
 * user was.
 *
 * @param draft - A draft that passed {@link validateNewTicket} (desk and area set).
 * @param attachments - The uploaded files.
 * @param context - From {@link ticketContext}; left out when empty.
 * @returns The body.
 */
export function toCreatePayload(
  draft: NewTicketDraft & { desk: TicketDesk; area: TicketArea },
  attachments: readonly Attachment[] = [],
  context?: TicketContext,
): CreateTicketPayload {
  const payload: CreateTicketPayload = { desk: draft.desk, area: draft.area, subject: draft.subject.trim(), body: draft.body.trim() };
  if (attachments.length > 0) payload.attachments = [...attachments];
  if (draft.childId) payload.childId = draft.childId;
  if (context && Object.keys(context).length > 0) payload.context = context;
  return payload;
}

/**
 * The counter under a text field.
 *
 * @param text - What was typed.
 * @param max - The longest allowed.
 * @returns e.g. "12 / 140", counted after trimming as the checks do.
 */
export function countLabel(text: string, max: number): string {
  return `${text.trim().length.toLocaleString("en-GB")} / ${max.toLocaleString("en-GB")}`;
}

// ─── Attachments ────────────────────────────────────────────────────────────

/** The message when a pick goes past {@link MAX_TICKET_ATTACHMENTS}. */
export const TOO_MANY_TICKET_FILES = `You can attach up to ${MAX_TICKET_ATTACHMENTS} files`;

/**
 * Adds picked files to a message's files: the chat kit's type and size rules
 * (`validateFile`), and the ticket cap of {@link MAX_TICKET_ATTACHMENTS}.
 *
 * @param current - The files already picked.
 * @param incoming - The files just chosen.
 * @returns The files kept and one message per problem.
 */
export function addTicketFiles<F extends { name: string; size: number; type?: string }>(current: readonly F[], incoming: readonly F[]): { files: F[]; errors: string[] } {
  const files = [...current];
  const errors: string[] = [];
  let overLimit = false;
  for (const file of incoming) {
    const error = validateFile(file);
    if (error) errors.push(error);
    else if (files.length >= MAX_TICKET_ATTACHMENTS) overLimit = true;
    else files.push(file);
  }
  if (overLimit) errors.push(TOO_MANY_TICKET_FILES);
  return { files, errors };
}

/**
 * A ticket attachment from an upload's answer (§1 `{ url, name, mimeType, size }`).
 *
 * @param uploaded - What the chat upload returned, with the chat kit's extras.
 * @returns Only the four fields a ticket takes.
 */
export function toTicketAttachment(uploaded: Attachment): Attachment {
  return { url: uploaded.url, name: uploaded.name, mimeType: uploaded.mimeType, size: uploaded.size };
}

// ─── Reopen window ──────────────────────────────────────────────────────────

/** What the reopen window is read from: the status, `resolvedAt`, and the detail's `reopenableUntil`. */
export type ReopenFields = Pick<TicketSummary, "status" | "resolvedAt"> & Partial<Pick<Ticket, "reopenableUntil">>;

/**
 * When a resolved ticket stops being reopenable: the server's
 * `reopenableUntil` when the detail carries it, else `resolvedAt` + 7 days.
 *
 * @param ticket - The ticket's status, `resolvedAt` and `reopenableUntil`.
 * @returns The deadline, or null when the ticket is not resolved (or has no readable date).
 */
export function reopenDeadline(ticket: ReopenFields): Date | null {
  if (ticket.status !== "resolved") return null;
  const until = Date.parse(ticket.reopenableUntil ?? "");
  if (!Number.isNaN(until)) return new Date(until);
  const resolved = Date.parse(ticket.resolvedAt ?? "");
  return Number.isNaN(resolved) ? null : new Date(resolved + REOPEN_WINDOW_MS);
}

/**
 * Whether the requester can still reopen a ticket.
 *
 * @param ticket - The ticket's status, `resolvedAt` and `reopenableUntil`.
 * @param now - The current time.
 * @returns True for a resolved ticket within 7 days of `resolvedAt`.
 */
export function canReopen(ticket: ReopenFields, now: Date = new Date()): boolean {
  const deadline = reopenDeadline(ticket);
  return deadline !== null && now.getTime() < deadline.getTime();
}

/**
 * Whether a resolved ticket is past its reopen window (a reply would be refused too).
 *
 * @param ticket - The ticket's status, `resolvedAt` and `reopenableUntil`.
 * @param now - The current time.
 * @returns True for a resolved ticket that can no longer be reopened.
 */
export function isPastReopenWindow(ticket: ReopenFields, now: Date = new Date()): boolean {
  return ticket.status === "resolved" && !canReopen(ticket, now);
}

// ─── 409 words ──────────────────────────────────────────────────────────────

/** A closed ticket takes no replies. */
export const TICKET_CLOSED_MESSAGE = "This ticket is closed, so it takes no more replies. Raise a new ticket if you still need help.";

/** A ticket holds at most 500 messages. */
export const TICKET_MESSAGE_CAP_MESSAGE = "This ticket has reached its limit of 500 messages, so it takes no more replies. Raise a new ticket if you still need help.";

/**
 * The words for a reopen (or a reply) after the 7-day window.
 *
 * @param reference - The ticket's reference, e.g. `TS-7KQ2M`.
 * @returns The sentence.
 */
export function reopenWindowMessage(reference: string): string {
  return `This ticket was resolved more than 7 days ago, so it can't be reopened. Raise a new ticket and mention ${reference}.`;
}

/** The ticket's status moved on, so the action no longer applies. */
export const TICKET_INVALID_TRANSITION_MESSAGE = "This ticket's status has changed, so that can't be done now. Check the latest and try again.";

/** Someone else changed the ticket at the same moment. */
export const TICKET_CHANGED_MESSAGE = "This ticket changed while you were working on it. Check the latest and try again.";

/** What the requester was doing when the API answered 409. */
export type TicketConflictAction = "reply" | "reopen" | "close";

/**
 * Whether an error is the API's 409 Conflict.
 *
 * @param error - What a request threw.
 * @returns True for an `ApiError` with status 409.
 */
export function isConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409;
}

/**
 * The words for a 409 on a ticket, from the API's reason (the top-level
 * `code`): `TICKET_CLOSED`, `REOPEN_WINDOW_PASSED`, `MESSAGE_CAP`,
 * `INVALID_TRANSITION` or `TICKET_CHANGED`. Without a known reason the
 * server's own message wins, else the ticket as last loaded decides.
 *
 * @param error - What the request threw.
 * @param action - What was being done.
 * @param ticket - The ticket as last loaded.
 * @param now - The current time.
 * @returns The message, or null when the error is not a 409.
 */
export function ticketConflictMessage(
  error: unknown,
  action: TicketConflictAction,
  ticket: ReopenFields & Pick<Ticket, "reference">,
  now: Date = new Date(),
): string | null {
  if (!isConflict(error)) return null;
  switch (error.reasonCode) {
    case "TICKET_CLOSED":
      return TICKET_CLOSED_MESSAGE;
    case "REOPEN_WINDOW_PASSED":
      return reopenWindowMessage(ticket.reference);
    case "MESSAGE_CAP":
      return TICKET_MESSAGE_CAP_MESSAGE;
    case "INVALID_TRANSITION":
      return TICKET_INVALID_TRANSITION_MESSAGE;
    case "TICKET_CHANGED":
      return TICKET_CHANGED_MESSAGE;
    default:
      break;
  }
  const generic = ApiError.fromResponse({ status: 409 }, null).message;
  const server = error.message?.trim();
  if (server && server !== generic) return server;
  if (ticket.status === "closed") return TICKET_CLOSED_MESSAGE;
  if (action === "reopen" || isPastReopenWindow(ticket, now)) return reopenWindowMessage(ticket.reference);
  return action === "reply" ? TICKET_MESSAGE_CAP_MESSAGE : TICKET_CLOSED_MESSAGE;
}

// ─── Unread ─────────────────────────────────────────────────────────────────

/**
 * The "N new" badge of a ticket row: messages from support since the
 * requester last opened it (`unread`; opening the ticket clears it on the server).
 *
 * @param ticket - The ticket's `unread`.
 * @returns e.g. "2 new", or null when there is nothing new.
 */
export function unreadLabel(ticket: Pick<TicketSummary, "unread">): string | null {
  const count = Number(ticket.unread) || 0;
  return count > 0 ? `${count.toLocaleString("en-GB")} new` : null;
}

/**
 * Unread messages across tickets, for a heading's badge.
 *
 * @param tickets - The tickets loaded.
 * @returns The sum of their `unread`.
 */
export function totalUnread(tickets: readonly Pick<TicketSummary, "unread">[]): number {
  return tickets.reduce((sum, ticket) => sum + (Number(ticket.unread) || 0), 0);
}

// ─── Thread ─────────────────────────────────────────────────────────────────

/**
 * A ticket's messages as the thread lists them: oldest first, internal notes
 * left out (the API already removes them for the requester).
 *
 * @param ticket - The ticket.
 * @returns A new array, sorted by `createdAt`.
 */
export function threadMessages(ticket: Pick<Ticket, "messages">): TicketMessage[] {
  return (ticket.messages ?? [])
    .filter((message) => !message.internal)
    .map((message, index) => ({ message, index, at: Date.parse(message.createdAt) }))
    .sort((a, b) => (Number.isNaN(a.at) || Number.isNaN(b.at) || a.at === b.at ? a.index - b.index : a.at - b.at))
    .map(({ message }) => message);
}

/** Who wrote a message, as the thread names them. */
export interface MessageAuthorLabel {
  /** "You", or the author's name. */
  name: string;
  /** "Talim support" or "School" for staff; null for the requester. */
  role: string | null;
}

/** Roles that answer on the school desk. */
const SCHOOL_STAFF_ROLES: ReadonlySet<string> = new Set(["school_admin", "school_sub_admin"]);

/**
 * A message's author line: "You" for the requester; otherwise the author's
 * name and which desk they answer for.
 *
 * @param message - The message.
 * @param ticket - The ticket (its requester and desk).
 * @returns The name and the role line.
 */
export function authorLabel(message: Pick<TicketMessage, "author">, ticket: Pick<TicketSummary, "requester" | "desk">): MessageAuthorLabel {
  if (message.author.id && message.author.id === ticket.requester.id) return { name: "You", role: null };
  const role = message.author.role === "admin" ? "Talim support" : SCHOOL_STAFF_ROLES.has(message.author.role) ? "School" : ticket.desk === "talim" ? "Talim support" : "School";
  return { name: message.author.name?.trim() || role, role };
}

// ─── Times ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A date as "8 Oct", with the year when it is not this year.
 *
 * @param date - The date.
 * @param now - The current time.
 * @returns e.g. "8 Oct" or "8 Oct 2025".
 */
function shortDate(date: Date, now: Date): string {
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/**
 * A clock time as "3:14pm".
 *
 * @param date - The date.
 * @returns The time in the viewer's timezone.
 */
function clock(date: Date): string {
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(date.getMinutes()).padStart(2, "0")}${hours < 12 ? "am" : "pm"}`;
}

/**
 * How long ago something happened, in words.
 *
 * @param iso - When it happened.
 * @param now - The current time.
 * @returns "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago",
 *   then the date ("12 Sep"); an empty string when unreadable.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  const at = Date.parse(iso ?? "");
  if (Number.isNaN(at)) return "";
  const minutes = Math.floor((now.getTime() - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(new Date(at), now);
}

/**
 * A list row's activity line.
 *
 * @param ticket - The ticket's `lastActivityAt`.
 * @param now - The current time.
 * @returns e.g. "Updated 2 hours ago".
 */
export function updatedLabel(ticket: Pick<TicketSummary, "lastActivityAt">, now: Date = new Date()): string {
  const when = relativeTime(ticket.lastActivityAt, now);
  return when ? `Updated ${when}` : "Updated recently";
}

/**
 * A message's time in the thread, or a deadline in a hint.
 *
 * @param value - An ISO timestamp or a date.
 * @param now - The current time.
 * @returns e.g. "Today, 9:20am" or "2 Oct, 3:14pm"; an empty string when unreadable.
 */
export function ticketTime(value: string | Date | null | undefined, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return `${sameDay ? "Today" : shortDate(date, now)}, ${clock(date)}`;
}

/**
 * The hint beside "Reopen".
 *
 * @param ticket - The ticket's status, `resolvedAt` and `reopenableUntil`.
 * @param now - The current time.
 * @returns e.g. "You can reopen until 13 Oct, 9:20am", or null when it can't be reopened.
 */
export function reopenHint(ticket: ReopenFields, now: Date = new Date()): string | null {
  const deadline = reopenDeadline(ticket);
  if (!deadline || !canReopen(ticket, now)) return null;
  return `You can reopen until ${ticketTime(deadline, now)}`;
}
