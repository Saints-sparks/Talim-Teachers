"use client";

import React, { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { Sheet } from "@/components/tl/Sheet";
import { eyebrow, fieldControl, focusRing, ghostButton, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";
import { groupContacts } from "@/hooks/messages/messages.logic";
import { useChatContacts, useStartConversation } from "@/hooks/messages/useInbox";
import { OFFICE_CONTACT_ID, type ChatContact } from "@/types/inboxSettings";
import { ThreadAvatar } from "./ThreadAvatar";

/** Props for {@link NewMessageSheet}. */
export interface NewMessageSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "New message": everyone the teacher can write to (§26 `GET /chat/contacts`)
 * in three groups — Parents, Colleagues, School office — with a search over
 * names and subtitles. Picking a person opens (or creates) the one-to-one
 * chat; picking the office opens the teacher's office room
 * (`POST /chat/office`). Either way the conversation opens and the sheet
 * closes.
 *
 * @param props - See {@link NewMessageSheetProps}.
 * @returns The sheet.
 */
export function NewMessageSheet({ open, onClose }: NewMessageSheetProps) {
  const contacts = useChatContacts(open);
  const { start, pendingId } = useStartConversation();
  const [term, setTerm] = useState("");
  const searchId = useId();

  useEffect(() => {
    if (open) setTerm("");
  }, [open]);

  const sections = groupContacts(contacts.data ?? [], term);

  /**
   * Opens the conversation with a contact and closes the sheet.
   *
   * @param contact - The person, or the office entry.
   */
  const pick = async (contact: ChatContact) => {
    if (pendingId) return;
    try {
      await start(contact);
      onClose();
    } catch (error) {
      toast.error(
        getErrorMessage(error, contact.userId === OFFICE_CONTACT_ID ? "The school office conversation could not be opened." : `Couldn't open a conversation with ${contact.name}.`),
      );
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      eyebrowText="Messages"
      title="New message"
      subtitle="Parents of your students, colleagues and the school office."
      footer={
        <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={onClose}>
          Cancel
        </button>
      }
    >
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search people
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tl-faint" aria-hidden />
        <input
          id={searchId}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by name or class"
          className={`${fieldControl} pl-10`}
          autoComplete="off"
        />
      </div>

      {contacts.isPending ? (
        <div role="status" aria-label="Loading your contacts" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-tl-line/70" />
          ))}
        </div>
      ) : contacts.isError ? (
        <div role="alert" className="rounded-2xl border border-tl-line-soft p-4">
          <p className="text-sm font-bold text-tl-ink">We couldn&apos;t load your contacts.</p>
          <p className="mt-1 text-[13px] text-tl-muted">{getErrorMessage(contacts.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={() => void contacts.refetch()}>
            Try again
          </button>
        </div>
      ) : sections.length === 0 ? (
        <p className="py-6 text-center text-sm text-tl-muted">{term.trim() ? `No one matches “${term.trim()}”.` : "There is no one to message yet."}</p>
      ) : (
        sections.map((section) => (
          <section key={section.group} aria-labelledby={`${searchId}-${section.group}`}>
            <h3 id={`${searchId}-${section.group}`} className={`${eyebrow} mb-1`}>
              {section.title}
            </h3>
            <ul className="flex flex-col">
              {section.contacts.map((contact) => {
                const office = contact.userId === OFFICE_CONTACT_ID;
                const busy = pendingId === contact.userId;
                return (
                  <li key={contact.userId}>
                    <button
                      type="button"
                      onClick={() => void pick(contact)}
                      disabled={Boolean(pendingId)}
                      aria-busy={busy || undefined}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-tl-subtle disabled:cursor-wait ${focusRing}`}
                    >
                      <ThreadAvatar name={contact.name} src={contact.avatarUrl} size={40} group={office} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-tl-ink">{contact.name}</span>
                        <span className="mt-0.5 block truncate text-[13px] text-tl-muted">{contact.subtitle}</span>
                      </span>
                      {busy ? <span className="text-[13px] font-bold text-tl-muted">Opening…</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </Sheet>
  );
}
