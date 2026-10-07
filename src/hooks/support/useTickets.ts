"use client";

/**
 * React Query hooks over the v1.5 tickets (`ticketsService`): the user's
 * list (one call per page, "Load more"), one ticket with its thread, and the
 * create, reply, reopen and close calls. Every write refreshes the ticket and
 * the list; opening a ticket clears its `unread` in the cached list (the
 * server has marked it read). Keys come from `queryKeys.support`.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useAttachmentUpload } from "@/components/chat-kit/useAttachmentUpload";
import { ticketsService } from "@/app/services/support/tickets.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import type { Attachment, CreateTicketPayload, PostTicketMessagePayload, Ticket, TicketPage } from "@/types/tickets";
import { TICKETS_PAGE_SIZE, toTicketAttachment } from "./tickets.logic";

/**
 * The signed-in user's id, for the query keys.
 *
 * @returns The id, or an empty string when signed out.
 */
function useUserId(): string {
  const { user } = useAuth();
  return user?.userId ?? "";
}

/**
 * The user's tickets, most recent activity first, a page at a time.
 *
 * @returns The infinite query; `fetchNextPage` loads the next page while `hasNextPage`.
 */
export function useMyTickets(): UseInfiniteQueryResult<InfiniteData<TicketPage, number>, unknown> {
  const userId = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.support.mine(userId),
    queryFn: ({ pageParam }) => ticketsService.listMine({ page: pageParam, limit: TICKETS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.lastPage ? last.meta.page + 1 : undefined),
    enabled: Boolean(userId),
    staleTime: staleTimes.list,
  });
}

/**
 * The cached list pages with one ticket's `unread` set to 0.
 *
 * @param data - The cached pages, if any.
 * @param ticketId - The ticket just opened.
 * @returns New pages when that ticket had unread messages, else the same data.
 */
export function clearUnreadInPages(data: InfiniteData<TicketPage, number> | undefined, ticketId: string): InfiniteData<TicketPage, number> | undefined {
  if (!data || !data.pages.some((page) => page.data.some((row) => row.id === ticketId && row.unread > 0))) return data;
  return { ...data, pages: data.pages.map((page) => ({ ...page, data: page.data.map((row) => (row.id === ticketId ? { ...row, unread: 0 } : row)) })) };
}

/**
 * One ticket with its thread. Opening it marks it read on the server, so its
 * row in the cached list loses its "new" badge at once.
 *
 * @param ticketId - The ticket, or null while none is open.
 * @returns The query.
 */
export function useTicket(ticketId: string | null): UseQueryResult<Ticket, unknown> {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.support.ticket(userId, ticketId ?? ""),
    queryFn: async () => {
      const ticket = await ticketsService.get(ticketId as string);
      queryClient.setQueriesData<InfiniteData<TicketPage, number>>({ queryKey: queryKeys.support.mine(userId) }, (data) => clearUnreadInPages(data, ticket.id));
      return ticket;
    },
    enabled: Boolean(userId && ticketId),
    staleTime: staleTimes.live,
  });
}

/**
 * Refreshes one ticket and the list (after any write, or a 409).
 *
 * @returns `refresh(ticketId)`, which resolves when both are refetched.
 */
export function useRefreshTicket(): (ticketId: string) => Promise<void> {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useCallback(
    async (ticketId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.support.ticket(userId, ticketId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.support.mine(userId) }),
      ]);
    },
    [queryClient, userId],
  );
}

/**
 * Raises a ticket (`POST /tickets`); the new ticket is cached and the list refetched.
 *
 * @returns The mutation; it resolves with the new ticket.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useMutation<Ticket, unknown, CreateTicketPayload>({
    mutationFn: (payload) => ticketsService.create(payload),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.support.ticket(userId, ticket.id), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.mine(userId) });
    },
  });
}

/**
 * Replies on a ticket (`POST /tickets/:id/messages`), then refetches it.
 *
 * @param ticketId - The ticket.
 * @returns The mutation.
 */
export function useReplyToTicket(ticketId: string) {
  const refresh = useRefreshTicket();
  return useMutation<Ticket, unknown, PostTicketMessagePayload>({
    mutationFn: (payload) => ticketsService.reply(ticketId, payload),
    onSettled: () => refresh(ticketId),
  });
}

/**
 * Reopens a resolved ticket (`POST /tickets/:id/reopen`), then refetches it.
 *
 * @param ticketId - The ticket.
 * @returns The mutation.
 */
export function useReopenTicket(ticketId: string) {
  const refresh = useRefreshTicket();
  return useMutation<Ticket, unknown, void>({
    mutationFn: () => ticketsService.reopen(ticketId),
    onSettled: () => refresh(ticketId),
  });
}

/**
 * Closes the user's own ticket (`POST /tickets/:id/close`), then refetches it.
 *
 * @param ticketId - The ticket.
 * @returns The mutation.
 */
export function useCloseTicket(ticketId: string) {
  const refresh = useRefreshTicket();
  return useMutation<Ticket, unknown, void>({
    mutationFn: () => ticketsService.close(ticketId),
    onSettled: () => refresh(ticketId),
  });
}

/** What {@link useTicketUploads} returns. */
export interface TicketUploads {
  /** Uploads the files (two at a time) and resolves with the ticket attachments, in order. */
  upload: (files: File[]) => Promise<Attachment[]>;
  isUploading: boolean;
}

/**
 * Uploads a ticket message's files with the chat kit's uploader (the app's
 * `POST /upload/chat-attachment`), keeping only `{ url, name, mimeType, size }`.
 *
 * @returns `upload(files)` and whether an upload is running.
 */
export function useTicketUploads(): TicketUploads {
  const { upload, isUploading } = useAttachmentUpload(ticketsService.uploadAttachment);
  const run = useCallback(
    async (files: File[]) => (files.length === 0 ? [] : (await upload(files.map((file) => ({ file })))).map(toTicketAttachment)),
    [upload],
  );
  return { upload: run, isUploading };
}
