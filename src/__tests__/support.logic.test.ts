import {
  MAX_TICKET_ATTACHMENTS,
  TICKET_CLOSED_MESSAGE,
  TICKET_MESSAGE_CAP_MESSAGE,
  addTicketFiles,
  allowedDesks,
  areaLabel,
  authorLabel,
  canReopen,
  countLabel,
  deskLabel,
  hasErrors,
  isPastReopenWindow,
  parseTicketParam,
  relativeTime,
  reopenDeadline,
  reopenHint,
  reopenWindowMessage,
  statusChip,
  supportHref,
  threadMessages,
  ticketAreasFor,
  ticketConflictMessage,
  toCreatePayload,
  updatedLabel,
  validateNewTicket,
  validateReply,
} from "@/hooks/support/tickets.logic";
import { attentionHref } from "@/hooks/today/today.routes";
import { ApiError } from "@/lib/apiError";
import type { Ticket, TicketMessage } from "@/types/v15";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const DAY = 24 * 60 * 60_000;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const GOOD = { area: "grading" as const, subject: "Scores vanish", body: "They were there yesterday.", attachments: [] };

describe("desks per role", () => {
  it("lets students and parents pick either desk, and staff only Talim", () => {
    expect(allowedDesks("student")).toEqual(["school", "talim"]);
    expect(allowedDesks("parent")).toEqual(["school", "talim"]);
    expect(allowedDesks("teacher")).toEqual(["talim"]);
    expect(allowedDesks("school_sub_admin")).toEqual(["talim"]);
    expect(allowedDesks(undefined)).toEqual(["talim"]);
  });

  it("refuses the school desk for a teacher and accepts it for a student", () => {
    expect(validateNewTicket({ ...GOOD, desk: "school" }, "teacher").desk).toBe("Your tickets go to the Talim support team");
    expect(validateNewTicket({ ...GOOD, desk: "talim" }, "teacher")).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: "school" }, "student")).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: null }, "student").desk).toBe("Choose who should get this ticket");
  });

  it("asks a parent for the child, and nobody else", () => {
    expect(validateNewTicket({ ...GOOD, desk: "school" }, "parent").childId).toBe("Choose which child this is about");
    expect(validateNewTicket({ ...GOOD, desk: "school", childId: "kid-1" }, "parent")).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: "talim" }, "teacher").childId).toBeUndefined();
  });

  it("labels the desks", () => {
    expect(deskLabel("talim", "Easy Sparks")).toBe("Talim support");
    expect(deskLabel("school", "Easy Sparks")).toBe("My school · Easy Sparks");
    expect(deskLabel("school", "  ")).toBe("My school");
  });
});

describe("new ticket and reply checks", () => {
  it("needs an area, a 3–140 character subject and a 1–5000 character message", () => {
    const errors = validateNewTicket({ desk: "talim", area: null, subject: " ab ", body: "   " }, "teacher");
    expect(errors).toEqual({
      area: "Choose what it is about",
      subject: "Write a subject of at least 3 characters",
      body: "Write a message",
    });
    expect(hasErrors(errors)).toBe(true);
    expect(validateNewTicket({ ...GOOD, desk: "talim", subject: "x".repeat(141) }, "teacher").subject).toBe("Keep the subject to 140 characters or fewer");
    expect(validateNewTicket({ ...GOOD, desk: "talim", body: "x".repeat(5001) }, "teacher").body).toBe("Keep the message to 5,000 characters or fewer");
    expect(hasErrors({})).toBe(false);
  });

  it("allows up to five attachments", () => {
    expect(validateNewTicket({ ...GOOD, desk: "talim", attachments: new Array(MAX_TICKET_ATTACHMENTS).fill(0) }, "teacher")).toEqual({});
    expect(validateNewTicket({ ...GOOD, desk: "talim", attachments: new Array(6).fill(0) }, "teacher").attachments).toBe("Attach up to 5 files");
    expect(validateReply("Thanks", new Array(6).fill(0))).toEqual({ attachments: "Attach up to 5 files" });
    expect(validateReply("  ")).toEqual({ body: "Write a message" });
    expect(validateReply("Thanks")).toEqual({});
  });

  it("builds a trimmed POST /tickets body", () => {
    const file = { url: "https://x/a.png", name: "a.png", mimeType: "image/png", size: 10 };
    expect(toCreatePayload({ desk: "talim", area: "grading", subject: "  Scores  ", body: " Gone \n" })).toEqual({ desk: "talim", area: "grading", subject: "Scores", body: "Gone" });
    expect(toCreatePayload({ desk: "school", area: "fees", subject: "Fee", body: "Paid twice", childId: "kid-1" }, [file])).toEqual({
      desk: "school",
      area: "fees",
      subject: "Fee",
      body: "Paid twice",
      attachments: [file],
      childId: "kid-1",
    });
  });

  it("counts after trimming", () => {
    expect(countLabel("  abc ", 140)).toBe("3 / 140");
    expect(countLabel("x".repeat(1200), 5000)).toBe("1,200 / 5,000");
  });

  it("keeps the chat kit's file rules and the five-file cap", () => {
    const file = (name: string, size = 1000) => ({ name, size, type: "" });
    const five = ["a.pdf", "b.pdf", "c.pdf", "d.pdf"].map((name) => file(name));
    const result = addTicketFiles(five, [file("e.png"), file("f.png"), file("virus.exe")]);
    expect(result.files.map((f) => f.name)).toEqual(["a.pdf", "b.pdf", "c.pdf", "d.pdf", "e.png"]);
    expect(result.errors).toEqual(["virus.exe: This file type isn't supported", "You can attach up to 5 files"]);
  });
});

describe("labels", () => {
  it("names the statuses and colours their chips", () => {
    expect(statusChip("open")).toEqual({ label: "Open", tone: "info" });
    expect(statusChip("in_progress")).toEqual({ label: "In progress", tone: "accent" });
    expect(statusChip("waiting_on_user")).toEqual({ label: "Waiting on you", tone: "warning" });
    expect(statusChip("resolved")).toEqual({ label: "Resolved", tone: "success" });
    expect(statusChip("closed")).toEqual({ label: "Closed", tone: "muted" });
  });

  it("offers the teacher's areas, ending with Something else", () => {
    expect(ticketAreasFor("teacher").map(areaLabel)).toEqual(["Grading", "Attendance", "Timetable", "Messages", "Results", "Signing in", "Something else"]);
    expect(ticketAreasFor("parent")[0]).toBe("payments");
    expect(ticketAreasFor("student").at(-1)).toBe("other");
  });

  it("says when a ticket last changed", () => {
    expect(relativeTime(ago(30_000), NOW)).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe("5 minutes ago");
    expect(updatedLabel({ lastActivityAt: ago(2 * 60 * 60_000) }, NOW)).toBe("Updated 2 hours ago");
    expect(updatedLabel({ lastActivityAt: ago(DAY + 1000) }, NOW)).toBe("Updated yesterday");
    expect(updatedLabel({ lastActivityAt: ago(4 * DAY) }, NOW)).toBe("Updated 4 days ago");
    expect(updatedLabel({ lastActivityAt: "nonsense" }, NOW)).toBe("Updated recently");
  });
});

describe("the 7-day reopen window", () => {
  it("runs from resolvedAt, only for a resolved ticket", () => {
    const recent = { status: "resolved" as const, resolvedAt: ago(2 * DAY) };
    const old = { status: "resolved" as const, resolvedAt: ago(10 * DAY) };
    expect(reopenDeadline(recent)?.toISOString()).toBe(new Date(NOW.getTime() + 5 * DAY).toISOString());
    expect(canReopen(recent, NOW)).toBe(true);
    expect(canReopen(old, NOW)).toBe(false);
    expect(isPastReopenWindow(old, NOW)).toBe(true);
    expect(isPastReopenWindow(recent, NOW)).toBe(false);
    expect(reopenDeadline({ status: "open", resolvedAt: null })).toBeNull();
    expect(canReopen({ status: "closed", resolvedAt: ago(DAY) }, NOW)).toBe(false);
    expect(reopenHint(recent, NOW)).toMatch(/^You can reopen until \d+ Oct, \d+:\d{2}(am|pm)$/);
    expect(reopenHint(old, NOW)).toBeNull();
  });
});

describe("409 words", () => {
  const ticket = { status: "resolved" as const, resolvedAt: ago(10 * DAY), reference: "TS-2BN6R" };
  const bare409 = ApiError.fromResponse({ status: 409 }, null);

  it("prefers the server's own message", () => {
    const server = ApiError.fromResponse({ status: 409 }, { error: { code: "CONFLICT", message: "Resolved over 7 days ago." } });
    expect(ticketConflictMessage(server, "reopen", ticket, NOW)).toBe("Resolved over 7 days ago.");
  });

  it("explains a bare 409 from the ticket as last loaded", () => {
    expect(ticketConflictMessage(bare409, "reopen", ticket, NOW)).toBe(reopenWindowMessage("TS-2BN6R"));
    expect(reopenWindowMessage("TS-2BN6R")).toBe("This ticket was resolved more than 7 days ago, so it can't be reopened. Raise a new ticket and mention TS-2BN6R.");
    expect(ticketConflictMessage(bare409, "reply", { ...ticket, status: "closed" }, NOW)).toBe(TICKET_CLOSED_MESSAGE);
    expect(ticketConflictMessage(bare409, "reply", { status: "open", resolvedAt: null, reference: "TS-1" }, NOW)).toBe(TICKET_MESSAGE_CAP_MESSAGE);
  });

  it("is null for anything but a 409", () => {
    expect(ticketConflictMessage(ApiError.fromResponse({ status: 500 }, null), "reply", ticket, NOW)).toBeNull();
    expect(ticketConflictMessage(new Error("x"), "reply", ticket, NOW)).toBeNull();
  });
});

describe("thread", () => {
  const author = (id: string, role: TicketMessage["author"]["role"], name = "Someone") => ({ id, name, role });
  const message = (id: string, createdAt: string, by = author("me", "teacher"), internal = false): TicketMessage => ({
    id,
    author: by,
    body: id,
    attachments: [],
    internal,
    createdAt,
  });

  it("lists messages oldest first and leaves internal notes out", () => {
    const ticket = { messages: [message("b", ago(DAY)), message("a", ago(2 * DAY)), message("note", ago(3 * DAY), author("s", "admin"), true)] };
    expect(threadMessages(ticket).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("calls the requester You and names which desk staff answer for", () => {
    const ticket = { requester: { userId: "me", role: "teacher" as const }, desk: "talim" as const } as Pick<Ticket, "requester" | "desk">;
    expect(authorLabel(message("1", ago(1), author("me", "teacher")), ticket)).toEqual({ name: "You", role: null });
    expect(authorLabel(message("2", ago(1), author("t1", "admin", "Tolu")), ticket)).toEqual({ name: "Tolu", role: "Talim support" });
    expect(authorLabel(message("3", ago(1), author("s1", "school_admin", "Mrs Obi")), ticket)).toEqual({ name: "Mrs Obi", role: "School" });
  });
});

describe("deep link", () => {
  it("opens Settings → Help with the thread, or My tickets without an id", () => {
    expect(supportHref("tk-open")).toBe("/settings?tab=help&ticket=tk-open");
    expect(supportHref(null)).toBe("/settings?tab=help");
    expect(attentionHref({ page: "support", ticketId: "tk 1" })).toBe("/settings?tab=help&ticket=tk%201");
    expect(parseTicketParam(" tk-open ")).toBe("tk-open");
    expect(parseTicketParam("")).toBeNull();
    expect(parseTicketParam(null)).toBeNull();
  });
});
