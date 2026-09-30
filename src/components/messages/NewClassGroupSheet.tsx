"use client";

import React, { useEffect, useId, useState } from "react";
import { toast } from "@/components/CustomToast";
import { Sheet } from "@/components/tl/Sheet";
import { chip, fieldControl, fieldLabel, ghostButton, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";
import { useMyClasses } from "@/hooks/attendance/useRegister";
import { useClassGroup } from "@/hooks/messages/useInbox";

/** Props for {@link NewClassGroupSheet}. */
export interface NewClassGroupSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Longest group name (the server's limit). */
const NAME_MAX = 80;

/**
 * "New class group" (the design's `group` sheet): a name and one of the
 * teacher's classes; everyone in the class is added, students can reply and
 * parents are not included. Uses the existing `POST /chat/groups`
 * (`class_group`) flow, which reuses the class's group when it already has
 * one, then opens it.
 *
 * @param props - See {@link NewClassGroupSheetProps}.
 * @returns The sheet.
 */
export function NewClassGroupSheet({ open, onClose }: NewClassGroupSheetProps) {
  const classes = useMyClasses();
  const { open: openGroup, pendingClassId } = useClassGroup();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const classLabelId = useId();

  useEffect(() => {
    if (!open) return;
    setName("");
    setClassId(undefined);
    setError(null);
  }, [open]);

  const list = classes.data ?? [];
  const chosen = list.find((c) => c.id === classId) ?? list[0];
  const busy = Boolean(pendingClassId);
  const valid = name.trim().length > 0 && Boolean(chosen);

  /** Creates (or reuses) the class group, opens it and closes the sheet. */
  const create = async () => {
    if (!valid || !chosen || busy) return;
    setError(null);
    try {
      const { reused } = await openGroup({ classId: chosen.id, name });
      toast.success(reused ? `Opened the existing ${chosen.name} group.` : `${name.trim()} created.`);
      onClose();
    } catch (failure) {
      setError(getErrorMessage(failure, "The group could not be created. Please try again."));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && !busy && onClose()}
      eyebrowText="Messages"
      title="New class group"
      subtitle="Everyone in the class is added. Students can reply; parents are not included."
      footer={
        <>
          <button type="button" className={`${ghostButton} min-h-[48px]`} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={() => void create()} disabled={!valid || busy}>
            {busy ? "Creating…" : "Create group"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className={fieldLabel}>
          Group name
        </label>
        <input
          id={nameId}
          value={name}
          maxLength={NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void create();
          }}
          placeholder="e.g. JSS1 A Mathematics"
          className={fieldControl}
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div id={classLabelId} className={fieldLabel}>
          Class
        </div>
        {classes.isPending ? (
          <div className="h-11 w-48 animate-pulse rounded-xl bg-tl-line/70" role="status" aria-label="Loading your classes" />
        ) : classes.isError ? (
          <p role="alert" className="text-[13px] font-bold text-tl-danger">
            {getErrorMessage(classes.error, "We couldn't load your classes.")}
          </p>
        ) : list.length === 0 ? (
          <p className="text-[13px] text-tl-muted">You have no classes to make a group for.</p>
        ) : (
          <div role="group" aria-labelledby={classLabelId} className="flex flex-wrap gap-2">
            {list.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === chosen?.id} onClick={() => setClassId(c.id)} disabled={busy} className={chip(c.id === chosen?.id)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {chosen ? (
        <p className="rounded-[14px] border border-tl-line-soft bg-tl-subtle p-3.5 text-[13px] leading-[1.6] text-tl-muted">
          {chosen.studentCount} {chosen.studentCount === 1 ? "student" : "students"} will be added.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] font-bold text-tl-danger">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
