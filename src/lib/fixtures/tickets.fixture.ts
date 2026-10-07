/**
 * Fixtures for the v1.5 tickets (`ticketsService` in fixture mode, and the
 * tests): an in-memory store seeded with four of the teacher's tickets on
 * the Talim desk, one per interesting state, typed with the generated
 * `TicketDto` so a contract change fails the type-check here too.
 *
 * - `tk-open`: open, with one unread staff reply.
 * - `tk-waiting`: waiting on the teacher.
 * - `tk-resolved`: resolved two days ago, so it can be reopened.
 * - `tk-old`: resolved ten days ago, past the 7-day window (reopen answers 409).
 *
 * Like the API: opening a ticket or writing on it marks it read; a reply to a
 * closed ticket answers 409 `TICKET_CLOSED`; a reopen (or reply) outside the
 * window answers 409 `REOPEN_WINDOW_PASSED`; a reopen of a ticket that is not
 * resolved answers 409 `INVALID_TRANSITION`. Times are relative to the
 * moment of seeding.
 */
import { ApiError } from "@/lib/apiError";
import {
  TICKET_REOPEN_WINDOW_DAYS,
  type Attachment,
  type CreateTicketPayload,
  type MyTicketsQuery,
  type PostTicketMessagePayload,
  type Ticket,
  type TicketMessage,
  type TicketPage,
  type TicketSummary,
} from "@/types/tickets";

/** The fixture requester: the same id as the tests' `mockTeacher`. */
export const FIXTURE_REQUESTER_ID = "68c0a1b2c3d4e5f600000001";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const WINDOW = TICKET_REOPEN_WINDOW_DAYS * DAY;
const SCHOOL = { id: "68c0a1b2c3d4e5f6000000aa", name: "Easy Sparks College" };
const ME = { id: FIXTURE_REQUESTER_ID, name: "Ada Bello", role: "teacher" };
const AGENT = { id: "agent-1", name: "Tolu from Talim", role: "admin" };

let tickets: Ticket[] = [];
let sequence = 0;

/**
 * An ISO time a number of milliseconds before `now`.
 *
 * @param now - The seeding time.
 * @param ago - How long before.
 * @returns The ISO string.
 */
function before(now: number, ago: number): string {
  return new Date(now - ago).toISOString();
}

/**
 * One public message.
 *
 * @param id - Its id.
 * @param author - Who wrote it.
 * @param body - The text.
 * @param createdAt - When.
 * @param attachments - Its files.
 * @returns The message.
 */
function message(id: string, author: TicketMessage["author"], body: string, createdAt: string, attachments: Attachment[] = []): TicketMessage {
  return { id, author, body, attachments, internal: false, createdAt };
}

/**
 * A full ticket as the API answers it to its requester, from the fields
 * that differ between the seeded tickets.
 *
 * @param fields - Id, reference, area, subject, status, times, messages and unread count.
 * @returns The ticket.
 */
function ticket(fields: Pick<Ticket, "id" | "reference" | "area" | "subject" | "status" | "createdAt" | "lastActivityAt" | "messages"> & Partial<Ticket>): Ticket {
  const resolvedAt = fields.resolvedAt ?? null;
  return {
    desk: "talim",
    priority: "normal",
    school: SCHOOL,
    childId: null,
    child: null,
    assignee: null,
    escalatedFrom: null,
    access: "requester",
    firstResponseAt: null,
    resolvedAt,
    closedAt: null,
    reopenableUntil: fields.status === "resolved" && resolvedAt ? new Date(Date.parse(resolvedAt) + WINDOW).toISOString() : null,
    escalatedAt: null,
    context: null,
    requester: { id: ME.id, name: ME.name, role: ME.role },
    messageCount: fields.messages.length,
    unread: 0,
    ...fields,
  };
}

/**
 * Seeds (or re-seeds) the store.
 *
 * @param now - The time the seeded tickets are relative to.
 * @returns Nothing.
 */
export function resetTicketsFixture(now: Date = new Date()): void {
  const at = now.getTime();
  sequence = 0;
  tickets = [
    ticket({
      id: "tk-open",
      reference: "TS-7KQ2M",
      area: "grading",
      subject: "Students can't see 1st CA for JSS2 B",
      status: "open",
      createdAt: before(at, 5 * HOUR),
      lastActivityAt: before(at, 2 * HOUR),
      firstResponseAt: before(at, 2 * HOUR),
      unread: 1,
      messages: [
        message("m-1", ME, "I published 1st CA for JSS2 B but students say they cannot see it.", before(at, 5 * HOUR), [
          { url: "https://res.cloudinary.com/talim/image/upload/grading.png", name: "grading.png", mimeType: "image/png", size: 182_000 },
        ]),
        message("m-2", AGENT, "Thanks, Ada. We're looking into it now.", before(at, 2 * HOUR)),
      ],
    }),
    ticket({
      id: "tk-waiting",
      reference: "TS-3HD8P",
      area: "signing_in",
      subject: "Signed out on my tablet every morning",
      status: "waiting_on_user",
      createdAt: before(at, 3 * DAY),
      lastActivityAt: before(at, 1 * DAY),
      firstResponseAt: before(at, 2 * DAY),
      messages: [
        message("m-3", ME, "The app signs me out on my tablet every morning.", before(at, 3 * DAY)),
        message("m-4", AGENT, "Which browser does the tablet use?", before(at, 1 * DAY)),
      ],
    }),
    ticket({
      id: "tk-resolved",
      reference: "TS-9WX4A",
      area: "timetable",
      subject: "Period 3 shows the wrong room",
      status: "resolved",
      createdAt: before(at, 4 * DAY),
      lastActivityAt: before(at, 2 * DAY),
      resolvedAt: before(at, 2 * DAY),
      messages: [
        message("m-5", ME, "Period 3 on Tuesday shows Lab 2 but we use Room 4.", before(at, 4 * DAY)),
        message("m-6", AGENT, "Fixed: the school updated the room.", before(at, 2 * DAY)),
      ],
    }),
    ticket({
      id: "tk-old",
      reference: "TS-2BN6R",
      area: "messages",
      subject: "Parent messages arrive late",
      status: "resolved",
      createdAt: before(at, 14 * DAY),
      lastActivityAt: before(at, 10 * DAY),
      resolvedAt: before(at, 10 * DAY),
      messages: [
        message("m-7", ME, "Parent messages reach me hours late.", before(at, 14 * DAY)),
        message("m-8", AGENT, "Push delivery was delayed; it is fixed now.", before(at, 10 * DAY)),
      ],
    }),
  ];
}

resetTicketsFixture();

/**
 * A ticket's list row: everything but the detail-only fields.
 *
 * @param stored - The ticket.
 * @returns The summary.
 */
function summary(stored: Ticket): TicketSummary {
  const { messages: _messages, reopenableUntil: _until, escalatedAt: _escalatedAt, context: _context, ...rest } = stored;
  return rest;
}

/**
 * A deep copy, so callers can't change the store.
 *
 * @param stored - The stored ticket.
 * @returns The copy.
 */
function copy(stored: Ticket): Ticket {
  return JSON.parse(JSON.stringify(stored)) as Ticket;
}

/**
 * Finds a ticket or answers 404 like the API.
 *
 * @param id - The ticket.
 * @returns The stored ticket.
 * @throws ApiError 404 when there is none.
 */
function find(id: string): Ticket {
  const stored = tickets.find((item) => item.id === id);
  if (!stored) throw new ApiError("NOT_FOUND", "Ticket not found.", 404);
  return stored;
}

/**
 * A 409 as the API sends it: the reason at the top-level `code`.
 *
 * @param reason - e.g. `TICKET_CLOSED`.
 * @param message - The server's message.
 * @returns The error.
 */
function conflict(reason: string, message: string): ApiError {
  return ApiError.fromResponse({ status: 409 }, { code: reason, statusCode: 409, message, error: { code: "CONFLICT", message } });
}

/**
 * Whether a resolved ticket is past its reopen window.
 *
 * @param stored - The ticket.
 * @returns True when it was resolved more than 7 days ago.
 */
function pastWindow(stored: Ticket): boolean {
  const resolved = Date.parse(stored.resolvedAt ?? "");
  return Number.isNaN(resolved) || Date.now() - resolved > WINDOW;
}

/**
 * Puts a resolved or waiting ticket back in the queue, as the API does on a
 * requester's reply or reopen: `in_progress` when assigned, else `open`.
 *
 * @param stored - The ticket.
 * @returns Nothing.
 */
function backToQueue(stored: Ticket): void {
  stored.status = stored.assignee ? "in_progress" : "open";
  stored.resolvedAt = null;
  stored.reopenableUntil = null;
}

/**
 * `GET /tickets/mine`.
 *
 * @param query - Status, page and limit.
 * @returns The page, most recent activity first.
 */
export function listMyTicketsFixture(query: MyTicketsQuery = {}): TicketPage {
  const limit = query.limit ?? 20;
  const page = query.page ?? 1;
  const rows = tickets
    .filter((item) => !query.status || item.status === query.status)
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
  return {
    data: rows.slice((page - 1) * limit, page * limit).map(summary),
    meta: { total: rows.length, page, limit, lastPage: Math.max(1, Math.ceil(rows.length / limit)) },
  };
}

/**
 * `GET /tickets/:id`. Opening a ticket marks it read.
 *
 * @param id - The ticket.
 * @returns A copy of the ticket.
 * @throws ApiError 404 when there is none.
 */
export function getTicketFixture(id: string): Ticket {
  const stored = find(id);
  stored.unread = 0;
  return copy(stored);
}

/**
 * `POST /tickets`.
 *
 * @param payload - The new ticket.
 * @returns The stored ticket.
 */
export function createTicketFixture(payload: CreateTicketPayload): Ticket {
  sequence += 1;
  const now = new Date().toISOString();
  const created = ticket({
    id: `tk-new-${sequence}`,
    reference: `TS-N${String(sequence).padStart(4, "0")}`,
    desk: payload.desk,
    childId: payload.childId ?? null,
    area: payload.area,
    subject: payload.subject,
    status: "open",
    createdAt: now,
    lastActivityAt: now,
    messages: [message(`m-new-${sequence}`, ME, payload.body, now, (payload.attachments ?? []).map((file) => ({ ...file })))],
  });
  tickets.unshift(created);
  return copy(created);
}

/**
 * `POST /tickets/:id/messages`. A reply to a waiting ticket, or to a resolved
 * one within 7 days, puts it back in the queue.
 *
 * @param id - The ticket.
 * @param payload - The reply.
 * @returns The ticket after the reply.
 * @throws ApiError 409 `TICKET_CLOSED`, or `REOPEN_WINDOW_PASSED` for a resolved ticket past its window.
 */
export function replyTicketFixture(id: string, payload: PostTicketMessagePayload): Ticket {
  const stored = find(id);
  if (stored.status === "closed") throw conflict("TICKET_CLOSED", "This ticket is closed.");
  if (stored.status === "resolved" && pastWindow(stored)) throw conflict("REOPEN_WINDOW_PASSED", "This ticket was resolved more than 7 days ago.");
  sequence += 1;
  const now = new Date().toISOString();
  stored.messages.push(message(`m-reply-${sequence}`, ME, payload.body, now, (payload.attachments ?? []).map((file) => ({ ...file }))));
  stored.messageCount = stored.messages.length;
  stored.lastActivityAt = now;
  stored.unread = 0;
  if (stored.status === "waiting_on_user" || stored.status === "resolved") backToQueue(stored);
  return copy(stored);
}

/**
 * `POST /tickets/:id/reopen`.
 *
 * @param id - The ticket.
 * @returns The reopened ticket.
 * @throws ApiError 409 `INVALID_TRANSITION` when it is not resolved, `REOPEN_WINDOW_PASSED` after 7 days.
 */
export function reopenTicketFixture(id: string): Ticket {
  const stored = find(id);
  if (stored.status !== "resolved") throw conflict("INVALID_TRANSITION", "Only a resolved ticket can be reopened.");
  if (pastWindow(stored)) throw conflict("REOPEN_WINDOW_PASSED", "This ticket was resolved more than 7 days ago.");
  backToQueue(stored);
  stored.lastActivityAt = new Date().toISOString();
  stored.unread = 0;
  return copy(stored);
}

/**
 * `POST /tickets/:id/close`. Closing a closed ticket answers it unchanged.
 *
 * @param id - The ticket.
 * @returns The closed ticket.
 */
export function closeTicketFixture(id: string): Ticket {
  const stored = find(id);
  if (stored.status === "closed") return copy(stored);
  const now = new Date().toISOString();
  stored.status = "closed";
  stored.closedAt = now;
  stored.reopenableUntil = null;
  stored.lastActivityAt = now;
  stored.unread = 0;
  return copy(stored);
}
