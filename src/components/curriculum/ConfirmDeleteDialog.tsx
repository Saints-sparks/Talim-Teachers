"use client";
import React from "react";
import { ConfirmSheet } from "@/components/tl/ConfirmSheet";

/** Props for {@link ConfirmDeleteDialog}. */
export interface ConfirmDeleteDialogProps {
  open: boolean;
  /** Heading, e.g. "Delete the curriculum?". */
  title: string;
  /** What is about to be removed, shown in bold. */
  subject: string;
  /** True while the delete request is in flight. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The confirmation for a destructive delete, as the redesign's red
 * confirmation sheet (focus trap, Escape, focus return). It cannot be
 * dismissed while the request is running.
 *
 * @param props - See {@link ConfirmDeleteDialogProps}.
 * @param props.open - Whether the sheet is showing.
 * @param props.title - Heading.
 * @param props.subject - The name of what will be deleted.
 * @param props.busy - Whether the delete is in flight.
 * @param props.onConfirm - Runs the delete.
 * @param props.onCancel - Closes the sheet.
 * @returns The sheet element.
 */
export function ConfirmDeleteDialog({ open, title, subject, busy, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <ConfirmSheet
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      danger
      busy={busy}
      confirmLabel="Delete"
      busyLabel="Deleting…"
      body={
        <>
          This permanently removes <span className="font-bold text-tl-ink">{subject}</span>, and students stop seeing it in their portal. You
          can&apos;t undo this.
        </>
      }
    />
  );
}
