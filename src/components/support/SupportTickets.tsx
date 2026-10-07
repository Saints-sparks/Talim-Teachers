"use client";

import React, { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { focusRing, ghostButton, pill, pillTone, primaryButton } from "@/components/tl/styles";
import { PanelError, PanelSkeleton, SettingsGroup } from "@/components/settings/SettingsRows";
import { useMyTickets } from "@/hooks/support/useTickets";
import { deskLabel, statusChip, updatedLabel } from "@/hooks/support/tickets.logic";
import type { TicketSummary } from "@/types/v15";
import { NewTicketSheet } from "./NewTicketSheet";
import { TicketThreadSheet } from "./TicketThreadSheet";

/** Props for {@link SupportTickets}. */
export interface SupportTicketsProps {
  /** The ticket whose thread is open (from `?ticket=`), or null. */
  openTicketId: string | null;
  /** Opens a ticket's thread, or closes it with null; the caller keeps the URL in step. */
  onOpenTicket: (ticketId: string | null) => void;
}

/**
 * Settings → Help → My tickets (v1.5 §1): a "New ticket" button and the
 * teacher's tickets, most recent activity first, each with its status chip,
 * desk, reference, an unread dot when support has written since, and when it
 * last changed. One `GET /tickets/mine` per page ("Load more"); no call per
 * row. A row opens the ticket's thread; a new ticket opens its thread once sent.
 *
 * Guide target: `settings-support` on the section.
 *
 * @param props - See {@link SupportTicketsProps}.
 * @param props.openTicketId - The ticket whose thread is open.
 * @param props.onOpenTicket - Opens or closes a thread.
 * @returns The section and its sheets.
 */
export function SupportTickets({ openTicketId, onOpenTicket }: SupportTicketsProps) {
  const { user } = useAuth();
  const list = useMyTickets();
  const [composing, setComposing] = useState(false);
  const tickets = list.data?.pages.flatMap((page) => page.data) ?? [];
  const now = new Date();

  return (
    <div data-guide="settings-support">
      <SettingsGroup heading="My tickets">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="min-w-0 flex-1 text-[13px] leading-[1.55] text-tl-muted">Questions and problems you have sent to the Talim support team. Replies arrive here and in your notifications.</p>
          <button type="button" className={primaryButton} onClick={() => setComposing(true)}>
            <Plus aria-hidden className="h-4 w-4" />
            New ticket
          </button>
        </div>
        {list.isPending ? (
          <PanelSkeleton label="Loading your tickets" rows={2} />
        ) : list.isError ? (
          <PanelError error={list.error} fallback="We couldn't load your tickets." onRetry={() => void list.refetch()} />
        ) : tickets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-tl-line p-4 text-sm text-tl-muted">
            No tickets yet. If something in Talim isn&apos;t working, raise a ticket and the support team will reply here.
          </p>
        ) : (
          <ul aria-label="My tickets" className="flex flex-col gap-2 pt-1">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketRow ticket={ticket} now={now} schoolName={user?.schoolName} onOpen={() => onOpenTicket(ticket.id)} />
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage ? (
          <div className="pt-3">
            <button type="button" className={ghostButton} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </SettingsGroup>

      <NewTicketSheet
        open={composing}
        onOpenChange={setComposing}
        role={user?.role}
        schoolName={user?.schoolName}
        onCreated={(ticket) => {
          setComposing(false);
          onOpenTicket(ticket.id);
        }}
      />
      <TicketThreadSheet
        ticketId={openTicketId}
        onOpenChange={(open) => {
          if (!open) onOpenTicket(null);
        }}
        onNewTicket={() => {
          onOpenTicket(null);
          setComposing(true);
        }}
        schoolName={user?.schoolName}
      />
    </div>
  );
}

/** Props for {@link TicketRow}. */
interface TicketRowProps {
  ticket: TicketSummary;
  now: Date;
  schoolName?: string | null;
  onOpen: () => void;
}

/**
 * One ticket in the list: subject, status chip, unread dot, reference,
 * desk and last activity, as one 44px+ button.
 *
 * @param props - See {@link TicketRowProps}.
 * @param props.ticket - The ticket.
 * @param props.now - The current time, for "Updated 2 hours ago".
 * @param props.schoolName - The user's school, for the desk label.
 * @param props.onOpen - Opens its thread.
 * @returns The row.
 */
function TicketRow({ ticket, now, schoolName, onOpen }: TicketRowProps) {
  const chip = statusChip(ticket.status);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-tl-line bg-tl-surface px-3.5 py-3 text-left transition-colors hover:bg-tl-bg ${focusRing}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {ticket.unread ? (
            <>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-tl-brand" />
              <span className="sr-only">New reply. </span>
            </>
          ) : null}
          <span className="truncate text-[15px] font-extrabold text-tl-ink">{ticket.subject}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-tl-muted">
          {ticket.reference} · {deskLabel(ticket.desk, schoolName)} · {updatedLabel(ticket, now)}
        </span>
      </span>
      <span className={`${pill} ${pillTone[chip.tone]}`}>{chip.label}</span>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-tl-faint" />
    </button>
  );
}
