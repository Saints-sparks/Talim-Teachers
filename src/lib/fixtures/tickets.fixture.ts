/**
 * Fixtures for the v1.5 tickets (`ticketsService` in fixture mode, and the
 * tests): an in-memory store seeded with four of the teacher's tickets on
 * the Talim desk, one per interesting state.
 *
 * - `tk-open`: open, with an unread staff reply.
 * - `tk-waiting`: waiting on the teacher.
 * - `tk-resolved`: resolved two days ago, so it can be reopened.
 * - `tk-old`: resolved ten days ago, past the 7-day window (reopen answers 409).
 *
 * Like the API, a reply to a closed ticket answers 409 and a reopen outside
 * the window answers 409. Times are relative to the moment of seeding.
 */
import { ApiError } from "@/lib/apiError";
import type {
  Attachment,
  CreateTicketPayload,
  MyTicketsQuery,
  PostTicketMessagePayload,
  Ticket,
  TicketMessage,
  TicketPage,
  TicketSummary,
} from "@/types/v15";

/** The fixture requester: the same id as the tests' `mockTeacher`. */
export const FIXTURE_REQUESTER_ID = "68c0a1b2c3d4e5f600000001";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const REQUESTER = { userId: FIXTURE_REQUESTER_ID, role: "teacher" as const, name: "Ada Bello" };
const ME = { id: FIXTURE_REQUESTER_ID, name: "Ada Bello", role: "teacher" as const };
const AGENT = { id: "agent-1", name: "Tolu from Talim", role: "admin" as const };

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
 * One message.
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
 * Seeds (or re-seeds) the store.
 *
 * @param now - The time the seeded tickets are relative to.
 * @returns Nothing.
 */
export function resetTicketsFixture(now: Date = new Date()): void {
  const at = now.getTime();
  sequence = 0;
  const base = { desk: "talim" as const, schoolId: "68c0a1b2c3d4e5f6000000aa", requester: REQUESTER, priority: "normal" as const };
  tickets = [
    {
      ...base,
      id: "tk-open",
      reference: "TS-7KQ2M",
      area: "grading",
      subject: "Students can't see 1st CA for JSS2 B",
      status: "open",
      createdAt: before(at, 5 * HOUR),
      lastActivityAt: before(at, 2 * HOUR),
      unread: true,
      messages: [
        message("m-1", ME, "I published 1st CA for JSS2 B but students say they cannot see it.", before(at, 5 * HOUR), [
          { url: "https://res.cloudinary.com/talim/image/upload/grading.png", name: "grading.png", mimeType: "image/png", size: 182_000 },
        ]),
        message("m-2", AGENT, "Thanks, Ada. We're looking into it now.", before(at, 2 * HOUR)),
      ],
    },
    {
      ...base,
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
    },
    {
      ...base,
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
    },
    {
      ...base,
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
    },
  ];
}

resetTicketsFixture();

/**
 * A ticket's list row: everything but the thread.
 *
 * @param ticket - The ticket.
 * @returns The summary.
 */
function summary(ticket: Ticket): TicketSummary {
  const { messages: _messages, ...rest } = ticket;
  return rest;
}

/**
 * A deep copy, so callers can't change the store.
 *
 * @param ticket - The stored ticket.
 * @returns The copy.
 */
function copy(ticket: Ticket): Ticket {
  return JSON.parse(JSON.stringify(ticket)) as Ticket;
}

/**
 * Finds a ticket or answers 404 like the API.
 *
 * @param id - The ticket.
 * @returns The stored ticket.
 * @throws ApiError 404 when there is none.
 */
function find(id: string): Ticket {
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) throw new ApiError("NOT_FOUND", "Ticket not found.", 404);
  return ticket;
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
    .filter((ticket) => !query.status || ticket.status === query.status)
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
  const ticket = find(id);
  ticket.unread = false;
  return copy(ticket);
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
  const ticket: Ticket = {
    id: `tk-new-${sequence}`,
    reference: `TS-N${String(sequence).padStart(4, "0")}`,
    desk: payload.desk,
    schoolId: "68c0a1b2c3d4e5f6000000aa",
    requester: REQUESTER,
    childId: payload.childId ?? null,
    area: payload.area,
    subject: payload.subject,
    status: "open",
    priority: "normal",
    createdAt: now,
    lastActivityAt: now,
    messages: [message(`m-new-${sequence}`, ME, payload.body, now, payload.attachments ?? [])],
  };
  tickets.unshift(ticket);
  return copy(ticket);
}

/**
 * `POST /tickets/:id/messages`.
 *
 * @param id - The ticket.
 * @param payload - The reply.
 * @returns Nothing.
 * @throws ApiError 409 when the ticket is closed.
 */
export function replyTicketFixture(id: string, payload: PostTicketMessagePayload): void {
  const ticket = find(id);
  if (ticket.status === "closed") throw new ApiError("CONFLICT", "This ticket is closed.", 409);
  sequence += 1;
  const now = new Date().toISOString();
  ticket.messages.push(message(`m-reply-${sequence}`, ME, payload.body, now, payload.attachments ?? []));
  ticket.lastActivityAt = now;
  if (ticket.status === "waiting_on_user") ticket.status = "open";
}

/**
 * `POST /tickets/:id/reopen`.
 *
 * @param id - The ticket.
 * @returns Nothing.
 * @throws ApiError 409 when it is not resolved or was resolved more than 7 days ago.
 */
export function reopenTicketFixture(id: string): void {
  const ticket = find(id);
  const resolved = Date.parse(ticket.resolvedAt ?? "");
  if (ticket.status !== "resolved" || Number.isNaN(resolved) || Date.now() - resolved > 7 * DAY) {
    throw new ApiError("CONFLICT", "This ticket can no longer be reopened.", 409);
  }
  ticket.status = "open";
  ticket.resolvedAt = null;
  ticket.lastActivityAt = new Date().toISOString();
}

/**
 * `POST /tickets/:id/close`.
 *
 * @param id - The ticket.
 * @returns Nothing.
 */
export function closeTicketFixture(id: string): void {
  const ticket = find(id);
  const now = new Date().toISOString();
  ticket.status = "closed";
  ticket.closedAt = now;
  ticket.lastActivityAt = now;
}
