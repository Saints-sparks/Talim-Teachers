/**
 * The requester's side of the v1.5 ticket system
 * (`talimBE-V2/docs/v1.5-platform-sync.md` §1, "Requester"):
 *
 * - `GET /tickets/mine?status=&page=&limit=`
 * - `GET /tickets/:id` (internal notes already removed by the API; opening
 *   it marks it read, so its `unread` drops to 0)
 * - `POST /tickets` (with `context`: page, app version, browser)
 * - `POST /tickets/:id/messages` (409 when the ticket is closed or full)
 * - `POST /tickets/:id/reopen` (409 outside the 7-day window)
 * - `POST /tickets/:id/close`
 * - attachments go up first through the chat upload, `POST /upload/chat-attachment`
 *
 * It replaces the old `POST /support/tickets` problem report. Every screen
 * makes one list call; nothing here is called per row. Every write answers
 * with the ticket as `GET /tickets/:id` reads it. With
 * `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build the calls answer from
 * `src/lib/fixtures/tickets.fixture.ts`.
 */
import { uploadChatAttachment, type ChatAttachmentUpload } from "@/app/services/chat.service";
import { api } from "@/lib/apiClient";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { CreateTicketPayload, MyTicketsQuery, PostTicketMessagePayload, Ticket, TicketPage } from "@/types/tickets";

/**
 * A query string from the defined values only; a list (`status`) goes
 * comma-separated, as the API takes it.
 *
 * @param query - Statuses, page and limit.
 * @returns `?status=open,in_progress&page=1&limit=20`, or an empty string when nothing is set.
 */
function toQuery(query: MyTicketsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const part = Array.isArray(value) ? value.join(",") : String(value ?? "");
    if (part !== "") params.set(key, part);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * The fixture module, loaded only in fixture mode.
 *
 * @returns The module.
 */
const fixtures = () => import("@/lib/fixtures/tickets.fixture");

export const ticketsService = {
  /**
   * `GET /tickets/mine`: one page of the signed-in user's tickets, most
   * recent activity first.
   *
   * @param query - Status filter, page and page size.
   * @returns The page and its meta.
   * @throws ApiError when the request fails.
   */
  listMine: async (query: MyTicketsQuery = {}): Promise<TicketPage> => {
    if (fixturesEnabled()) return (await fixtures()).listMyTicketsFixture(query);
    const body = await api.get<TicketPage>(`/tickets/mine${toQuery(query)}`);
    return { data: Array.isArray(body?.data) ? body.data : [], meta: body?.meta ?? { total: 0, page: query.page ?? 1, lastPage: 1, limit: query.limit ?? 20 } };
  },

  /**
   * `GET /tickets/:id`: one of the user's tickets with its thread. The
   * server marks it read for the requester.
   *
   * @param id - The ticket.
   * @returns The ticket.
   * @throws ApiError: 404 when it is not the user's ticket.
   */
  get: async (id: string): Promise<Ticket> => {
    if (fixturesEnabled()) return (await fixtures()).getTicketFixture(id);
    return api.get<Ticket>(`/tickets/${encodeURIComponent(id)}`);
  },

  /**
   * `POST /tickets`: raises a ticket. Teachers raise them to the Talim desk.
   *
   * @param payload - Desk, area, subject, first message, attachments and `context`.
   * @returns The new ticket.
   * @throws ApiError: 400 for a field the server refuses, 403 for a desk the role may not use.
   */
  create: async (payload: CreateTicketPayload): Promise<Ticket> => {
    if (fixturesEnabled()) return (await fixtures()).createTicketFixture(payload);
    return api.post<Ticket>("/tickets", payload);
  },

  /**
   * `POST /tickets/:id/messages`: the requester's reply. A reply to a
   * resolved ticket within 7 days reopens it.
   *
   * @param id - The ticket.
   * @param payload - The text and attachments.
   * @returns The ticket after the reply.
   * @throws ApiError: 409 `TICKET_CLOSED`, `REOPEN_WINDOW_PASSED` or `MESSAGE_CAP` (`reasonCode`).
   */
  reply: async (id: string, payload: PostTicketMessagePayload): Promise<Ticket> => {
    if (fixturesEnabled()) return (await fixtures()).replyTicketFixture(id, payload);
    return api.post<Ticket>(`/tickets/${encodeURIComponent(id)}/messages`, payload);
  },

  /**
   * `POST /tickets/:id/reopen`: reopens a resolved ticket.
   *
   * @param id - The ticket.
   * @returns The reopened ticket.
   * @throws ApiError: 409 `REOPEN_WINDOW_PASSED` more than 7 days after it was resolved, `INVALID_TRANSITION` when it is not resolved.
   */
  reopen: async (id: string): Promise<Ticket> => {
    if (fixturesEnabled()) return (await fixtures()).reopenTicketFixture(id);
    return api.post<Ticket>(`/tickets/${encodeURIComponent(id)}/reopen`);
  },

  /**
   * `POST /tickets/:id/close`: the requester closes their own ticket.
   *
   * @param id - The ticket.
   * @returns The closed ticket.
   * @throws ApiError when the request fails.
   */
  close: async (id: string): Promise<Ticket> => {
    if (fixturesEnabled()) return (await fixtures()).closeTicketFixture(id);
    return api.post<Ticket>(`/tickets/${encodeURIComponent(id)}/close`);
  },

  /**
   * Uploads one file for a ticket message through the app's existing chat
   * upload (`POST /upload/chat-attachment`); a fixture URL in fixture mode.
   *
   * @param file - The file.
   * @param onProgress - Called with a 0-1 fraction as bytes are sent.
   * @returns The stored file's URL and metadata.
   * @throws ApiError when the upload fails.
   */
  uploadAttachment: async (file: File, onProgress?: (fraction: number) => void): Promise<ChatAttachmentUpload> => {
    if (fixturesEnabled()) {
      onProgress?.(1);
      return { url: `https://res.cloudinary.com/talim/raw/upload/${encodeURIComponent(file.name)}`, type: "file", name: file.name, mimeType: file.type, size: file.size };
    }
    return uploadChatAttachment(file, onProgress);
  },
};
