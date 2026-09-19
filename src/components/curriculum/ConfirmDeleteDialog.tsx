"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Props for {@link ConfirmDeleteDialog}. */
export interface ConfirmDeleteDialogProps {
  open: boolean;
  /** Heading, e.g. "Delete resource?". */
  title: string;
  /** What is about to be removed, shown in bold. */
  subject: string;
  /** True while the delete request is in flight. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one confirmation for a destructive delete. Built on the Radix dialog, so
 * it locks page scroll, traps focus and closes on Escape. It cannot be
 * dismissed while the request is running.
 *
 * @param props - See {@link ConfirmDeleteDialogProps}.
 * @param props.open - Whether the dialog is showing.
 * @param props.title - Heading.
 * @param props.subject - The name of what will be deleted.
 * @param props.busy - Whether the delete is in flight.
 * @param props.onConfirm - Runs the delete.
 * @param props.onCancel - Closes the dialog.
 * @returns The dialog element.
 */
export function ConfirmDeleteDialog({ open, title, subject, busy, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            This will permanently remove <span className="font-medium text-[#030E18]">{subject}</span>. You can’t undo this
            action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy} className="border-[#F0F0F0] hover:bg-[#F0F0F0]">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy} className="bg-[#D92D20] hover:bg-[#B42318] text-white">
            {busy ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
