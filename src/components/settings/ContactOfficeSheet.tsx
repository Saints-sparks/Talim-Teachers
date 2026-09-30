"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/CustomToast";
import { Sheet, SheetRow } from "@/components/tl/Sheet";
import { ghostButton, primaryButton, rowButton } from "@/components/tl/styles";
import { messagesRoomUrl } from "@/app/hooks/useChatAlerts";
import { openOfficeRoom } from "@/app/services/chat.service";
import { getErrorMessage } from "@/lib/apiError";
import { useSchoolContact } from "@/hooks/settings/useAccount";
import { mapsHref, officeSubtitle, telHref } from "@/hooks/settings/settings.logic";

/** Props for {@link ContactOfficeSheet}. */
export interface ContactOfficeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown as the title until the school's own name arrives. */
  fallbackSchoolName?: string;
}

/**
 * The design's `contact` sheet: the school office's phone, email and address
 * (`GET /teachers/me/school`, only the ones the school has set) and a way to
 * message the office inside the portal (`POST /chat/office`).
 *
 * @param props - See {@link ContactOfficeSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onOpenChange - Opens or closes it.
 * @param props.fallbackSchoolName - The title while the contact loads.
 * @returns The sheet.
 */
export function ContactOfficeSheet({ open, onOpenChange, fallbackSchoolName }: ContactOfficeSheetProps) {
  const router = useRouter();
  const contact = useSchoolContact(open);
  const [opening, setOpening] = useState(false);

  /** Opens (creating if needed) the teacher's office conversation. */
  const messageOffice = async () => {
    setOpening(true);
    try {
      const roomId = await openOfficeRoom();
      onOpenChange(false);
      router.push(messagesRoomUrl(roomId));
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't open the school office conversation. Please try again."));
    } finally {
      setOpening(false);
    }
  };

  const data = contact.data;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrowText="Contact"
      title={data?.name || fallbackSchoolName || "The school office"}
      subtitle={officeSubtitle(data?.officeHours)}
      footer={
        <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={() => onOpenChange(false)}>
          Close
        </button>
      }
    >
      {contact.isLoading ? (
        <div role="status" aria-label="Loading the school office's details" className="flex flex-col gap-2.5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-tl-line/70" />
          ))}
        </div>
      ) : contact.error ? (
        <div role="alert" className="rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
          <p className="text-sm font-bold text-tl-ink">We could not load the office&apos;s contact details.</p>
          <p className="mt-1 text-[13px] text-tl-muted">{getErrorMessage(contact.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={() => contact.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {data?.phone ? (
            <SheetRow
              label="Call the office"
              description={data.phone}
              action={
                <a href={telHref(data.phone)} className={rowButton} aria-label={`Call the office on ${data.phone}`}>
                  Call
                </a>
              }
            />
          ) : null}
          {data?.email ? (
            <SheetRow
              label="Email the office"
              description={data.email}
              action={
                <a href={`mailto:${data.email}`} className={rowButton} aria-label={`Email the office at ${data.email}`}>
                  Email
                </a>
              }
            />
          ) : null}
          {data?.address ? (
            <SheetRow
              label="Visit"
              description={data.address}
              action={
                <a
                  href={mapsHref(data.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowButton}
                  aria-label={`Open ${data.address} in Google Maps (opens in a new tab)`}
                >
                  Map
                </a>
              }
            />
          ) : null}
        </>
      )}
      <SheetRow
        label="Message in the portal"
        description="Usually answered the same school day"
        action={
          <button type="button" className={rowButton} onClick={messageOffice} disabled={opening} aria-label="Message the school office in the portal">
            {opening ? "Opening…" : "Open"}
          </button>
        }
      />
      <p className="text-[13px] leading-[1.6] text-tl-muted">
        For timetable changes or class assignments, contact the office. For a fault in the portal itself, use Report a problem.
      </p>
    </Sheet>
  );
}
