/**
 * Live contract check of My tickets (v1.5 §1) through this app's own
 * services, against a running API with the e2e seed (`talimBE-V2/e2e`).
 * Skipped unless `LIVE_API=1`:
 *
 *   LIVE_API=1 LIVE_DB=talim_v15_web NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5086 npx jest live.v15
 *
 * The seeded teacher raises a ticket to Talim with `ticketsService`; the
 * platform admin answers it with raw requests (Talim Admin's side). Checks:
 * create (with `context`, which the requester never reads back), the list's
 * `unread`, opening it (unread back to 0), a reply, reopen within 7 days, and
 * 409 `REOPEN_WINDOW_PASSED` and `TICKET_CLOSED` read from `reasonCode`. The
 * reopen window is passed by moving `resolvedAt` back 8 days in that API's
 * database, through the backend checkout's own `mongodb` driver
 * (`LIVE_BACKEND_DIR`, default `../talimBE-V2`). It writes to that database:
 * point it at a throwaway stack only.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { authService } from "@/app/services/auth.service";
import { ticketsService } from "@/app/services/support/tickets.service";
import { ticketConflictMessage, ticketContext, toCreatePayload, reopenWindowMessage, TICKET_CLOSED_MESSAGE } from "@/hooks/support/tickets.logic";
import { apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { APP_VERSION } from "@/lib/appVersion";
import type { Ticket } from "@/types/tickets";

const LIVE = process.env.LIVE_API === "1";
const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
const PASSWORD = process.env.LIVE_PASSWORD ?? "Demo#Pass2026";
const DOMAIN = process.env.LIVE_DOMAIN ?? "e2e.talim.test";
const DB = process.env.LIVE_DB ?? "";
const BACKEND = resolve(process.env.LIVE_BACKEND_DIR ?? "../talimBE-V2");
const RUN = Date.now().toString(36);

/**
 * A request as Talim Admin makes it, outside this app's services.
 *
 * @param method - The HTTP method.
 * @param path - The path under the API.
 * @param token - The bearer token, if any.
 * @param body - The JSON body, if any.
 * @returns The status and the body, unwrapped from `{ success, data }`.
 */
async function raw<T = Record<string, unknown>>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => null);
  const unwrapped = parsed && typeof parsed === "object" && "success" in parsed && "data" in parsed ? parsed.data : parsed;
  return { status: res.status, body: unwrapped as T };
}

/**
 * Moves a resolved ticket's `resolvedAt` into the past, in the live API's
 * database, so the 7-day reopen window has passed.
 *
 * @param ticketId - The ticket.
 * @param days - How many days ago it was resolved.
 * @returns Nothing; throws when no resolved ticket was changed.
 */
function ageResolved(ticketId: string, days: number): void {
  if (!DB || ["talim_e2e", "talim_portals"].includes(DB)) throw new Error("Set LIVE_DB to the throwaway stack's database.");
  const script = `const { MongoClient, ObjectId } = require(${JSON.stringify(`${BACKEND}/node_modules/mongodb`)});
(async () => {
  const client = await MongoClient.connect(process.env.LIVE_MONGO);
  const res = await client.db().collection("complaints").updateOne(
    { _id: new ObjectId(process.env.LIVE_ID), status: "resolved" },
    { $set: { resolvedAt: new Date(Date.now() - Number(process.env.LIVE_DAYS) * 864e5) } },
  );
  await client.close();
  if (res.modifiedCount !== 1) { console.error("no resolved ticket aged"); process.exit(1); }
})().catch((error) => { console.error(error); process.exit(1); });`;
  execFileSync(process.execPath, ["-e", script], {
    env: { ...process.env, LIVE_MONGO: `mongodb://127.0.0.1:27017/${DB}?replicaSet=rs0&directConnection=true`, LIVE_ID: ticketId, LIVE_DAYS: String(days) },
    stdio: "pipe",
  });
}

/**
 * What a promise rejected with.
 *
 * @param promise - The call.
 * @returns The `ApiError` it threw.
 */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

const live = LIVE ? describe : describe.skip;

live("v1.5 My tickets against the live API (teacher)", () => {
  jest.setTimeout(30_000);
  let admin = "";
  let teacherId = "";
  let created: Ticket;

  beforeAll(async () => {
    const login = await raw<{ access_token: string }>("POST", "/auth/admin-login", undefined, { email: `platform@${DOMAIN}`, password: PASSWORD });
    if (login.status >= 300) throw new Error(`platform admin could not sign in: ${login.status}`);
    admin = login.body.access_token;
    const auth = await authService.login({ email: `teacher@${DOMAIN}`, password: PASSWORD, deviceToken: "", platform: "web" });
    apiClient.setAccessToken(auth.access_token);
    teacherId = String(JSON.parse(Buffer.from(auth.access_token.split(".")[1], "base64url").toString()).sub);
  });

  afterAll(() => apiClient.setAccessToken(null));

  it("raises a ticket to Talim with context, which only the desk reads", async () => {
    const context = ticketContext(APP_VERSION, { path: "/settings?tab=help", userAgent: "jest-live (Talim Teachers)" });
    created = await ticketsService.create(
      toCreatePayload({ desk: "talim", area: "grading", subject: `Live check ${RUN}`, body: "Scores vanish after saving." }, [], context),
    );
    expect(created).toMatchObject({ desk: "talim", area: "grading", status: "open", access: "requester", unread: 0, messageCount: 1, context: null, childId: null });
    expect(created.requester.id).toBe(teacherId);
    expect(created.reference).toMatch(/^TS-/);
    const desk = await raw<Ticket>("GET", `/tickets/${created.id}`, admin);
    expect(desk.body.context).toEqual({ path: "/settings?tab=help", appVersion: APP_VERSION, userAgent: "jest-live (Talim Teachers)" });

    const school = await failure(ticketsService.create({ desk: "school", area: "other", subject: "Wrong desk", body: "Teachers raise to Talim." }));
    expect(school.status).toBe(400);
  });

  it("lists it with unread staff replies, and opening it clears them", async () => {
    expect((await raw("POST", `/tickets/${created.id}/messages`, admin, { body: "Which class is it?" })).status).toBe(201);
    expect((await raw("POST", `/tickets/${created.id}/messages`, admin, { body: "Internal: check the CA config.", internal: true })).status).toBe(201);
    const page = await ticketsService.listMine({ page: 1, limit: 50 });
    const row = page.data.find((item) => item.id === created.id);
    expect(row).toMatchObject({ unread: 1, status: "in_progress", messageCount: 2 });
    expect(page.meta).toMatchObject({ page: 1, limit: 50 });

    const opened = await ticketsService.get(created.id);
    expect(opened.messages.map((message) => message.body)).toEqual(["Scores vanish after saving.", "Which class is it?"]);
    expect(opened.messages.every((message) => !message.internal)).toBe(true);
    const after = await ticketsService.listMine({ page: 1, limit: 50 });
    expect(after.data.find((item) => item.id === created.id)?.unread).toBe(0);
  });

  it("replies, and reopens a resolved ticket within 7 days", async () => {
    const replied = await ticketsService.reply(created.id, { body: "Grade 5A, first CA." });
    expect(replied.messageCount).toBe(3);
    expect(replied.messages.at(-1)?.author.id).toBe(teacherId);
    expect((await raw("PATCH", `/tickets/${created.id}`, admin, { status: "resolved" })).status).toBe(200);
    const resolved = await ticketsService.get(created.id);
    expect(resolved.status).toBe("resolved");
    expect(Date.parse(resolved.reopenableUntil ?? "")).toBeGreaterThan(Date.now());
    const reopened = await ticketsService.reopen(created.id);
    expect(reopened.status).toBe("open");
  });

  it("answers 409 REOPEN_WINDOW_PASSED once the window has passed, and TICKET_CLOSED after closing", async () => {
    expect((await raw("PATCH", `/tickets/${created.id}`, admin, { status: "resolved" })).status).toBe(200);
    ageResolved(created.id, 8);
    const stale = await ticketsService.get(created.id);
    const reopen = await failure(ticketsService.reopen(created.id));
    expect([reopen.status, reopen.reasonCode]).toEqual([409, "REOPEN_WINDOW_PASSED"]);
    expect(ticketConflictMessage(reopen, "reopen", stale)).toBe(reopenWindowMessage(stale.reference));
    const reply = await failure(ticketsService.reply(created.id, { body: "Still broken." }));
    expect([reply.status, reply.reasonCode]).toEqual([409, "REOPEN_WINDOW_PASSED"]);

    const closed = await ticketsService.close(created.id);
    expect(closed.status).toBe("closed");
    const late = await failure(ticketsService.reply(created.id, { body: "One more thing." }));
    expect([late.status, late.reasonCode]).toEqual([409, "TICKET_CLOSED"]);
    expect(ticketConflictMessage(late, "reply", closed)).toBe(TICKET_CLOSED_MESSAGE);
  });
});
