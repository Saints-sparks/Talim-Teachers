"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOUR_STEPS, useTour } from "@/components/tour/TourProvider";
import { SupportTickets } from "@/components/support/SupportTickets";
import { useAuth } from "@/app/context/AuthContext";
import { usePreferenceSaver } from "@/hooks/settings/usePreferenceSaver";
import { gettingStartedDescription } from "@/hooks/settings/settings.logic";
import { supportHref } from "@/hooks/support/tickets.logic";
import { ContactOfficeSheet } from "./ContactOfficeSheet";
import { LinkRow, SettingsGroup, ToggleRow } from "./SettingsRows";

/** Props for {@link HelpPanel}. */
export interface HelpPanelProps {
  /** A ticket to open on arrival (`/settings?tab=help&ticket=<id>`, a support notification's link). */
  ticketId?: string | null;
}

/**
 * Settings → Help: the portal tour, the page guides switch, the school
 * office's contact sheet, and My tickets for the Talim support team (v1.5
 * tickets, which replaced "Report a problem"). The open ticket follows
 * `?ticket=`, so a support notification opens its thread and closing the
 * thread drops the parameter.
 *
 * @param props - See {@link HelpPanelProps}.
 * @param props.ticketId - The ticket to open on arrival.
 * @returns The panel content.
 */
export function HelpPanel({ ticketId = null }: HelpPanelProps) {
  const tour = useTour();
  const router = useRouter();
  const { user } = useAuth();
  const { preferences, save, savingKey } = usePreferenceSaver();
  const [contactOpen, setContactOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(ticketId);

  // Follow the URL (a notification clicked while Help is open, back and forward).
  useEffect(() => setOpenTicket(ticketId), [ticketId]);

  /**
   * Opens or closes a ticket's thread and records it in the URL.
   *
   * @param id - The ticket, or null to close the thread.
   */
  const showTicket = (id: string | null) => {
    setOpenTicket(id);
    const target = supportHref(id);
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  };

  return (
    <>
      <SettingsGroup heading="Support">
        {tour ? <LinkRow label="Getting started" description={gettingStartedDescription(TOUR_STEPS.length)} onClick={tour.openTour} /> : null}
        <ToggleRow
          label="Show page guides"
          description="A short guide on each page the first time you open it"
          checked={preferences.guides.showAppTips}
          disabled={savingKey === "guides.showAppTips"}
          onChange={(value) => save("guides.showAppTips", { guides: { ...preferences.guides, showAppTips: value } })}
        />
        <LinkRow label="Contact the school office" description="Call, email or visit" onClick={() => setContactOpen(true)} />
      </SettingsGroup>
      <SupportTickets openTicketId={openTicket} onOpenTicket={showTicket} />
      <ContactOfficeSheet open={contactOpen} onOpenChange={setContactOpen} fallbackSchoolName={user?.schoolName} />
    </>
  );
}
