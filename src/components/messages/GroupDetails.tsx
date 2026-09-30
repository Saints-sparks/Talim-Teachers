"use client";

import React, { useId } from "react";
import { Camera, Loader2, LogOut, Pencil, Trash2 } from "lucide-react";
import { IMAGE_ACCEPT } from "@/components/chat-kit";
import { dangerGhostButton, fieldControl, focusRing, ghostButton, primaryButton, rowButton } from "@/components/tl/styles";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/app/lib/chat/groupPermissions";
import type { GroupInfoEditor } from "@/hooks/messages/useGroupInfoEditor";
import { ThreadAvatar } from "./ThreadAvatar";

/** Props for {@link GroupDetails}. */
export interface GroupDetailsProps {
  editor: GroupInfoEditor;
  name: string;
  description: string;
  avatarUrl: string;
  /** I'm a group admin: the name, description and picture are editable. */
  canEdit: boolean;
  canLeave: boolean;
  /** "Class group · 12 members · 3 online". */
  summary: string;
}

/**
 * The top of the info modal's Members tab for a group: the picture, the
 * name and the description, with a one-line summary. Group admins (and
 * nobody else) edit the name and the description inline (the description up
 * to 500 characters, with a counter) and change the picture; the server's
 * 403 is shown inline. Leave is offered for groups a member may leave.
 *
 * @param props - See {@link GroupDetailsProps}.
 * @returns The section.
 */
export default function GroupDetails({ editor, name, description, avatarUrl, canEdit, canLeave, summary }: GroupDetailsProps) {
  const { saving } = editor;
  const editable = canEdit && !editor.forbidden;
  const nameId = useId();
  const descriptionId = useId();
  const counterId = useId();
  const busy = saving !== null;

  return (
    <section aria-label="Group details" className="flex flex-col gap-4 rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
      <div className="flex items-center gap-3.5">
        <span className="relative">
          <ThreadAvatar name={name} group src={avatarUrl || null} size={56} />
          {saving === "avatar" ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-[13px] bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" aria-label="Saving the picture" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          {editor.editingName ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-[13px] font-bold text-tl-muted">
                Group name
              </label>
              <input
                id={nameId}
                value={editor.nameDraft}
                maxLength={GROUP_NAME_MAX}
                autoFocus
                onChange={(event) => editor.setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void editor.saveName();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    editor.cancelEditingName();
                  }
                }}
                className={fieldControl}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs ${editor.nameValid ? "text-tl-faint" : "font-bold text-tl-danger"}`}>
                  {editor.trimmedName.length === 0 ? "Enter a name" : `${editor.trimmedName.length}/${GROUP_NAME_MAX}`}
                </span>
                <span className="flex gap-2">
                  <button type="button" className={rowButton} onClick={editor.cancelEditingName}>
                    Cancel
                  </button>
                  <button type="button" className={primaryButton} disabled={!editor.nameValid || busy} onClick={() => void editor.saveName()}>
                    {saving === "name" ? "Saving…" : "Save"}
                  </button>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h3 className="break-words text-[17px] font-extrabold text-tl-ink">{name}</h3>
              {editable ? (
                <button
                  type="button"
                  aria-label="Edit the group name"
                  title="Edit the group name"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-muted hover:bg-tl-surface ${focusRing}`}
                  onClick={editor.startEditingName}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          )}
          <p className="mt-0.5 text-[13px] text-tl-muted">{summary}</p>
        </div>
      </div>

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <input ref={editor.fileInputRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={editor.handlePicture} aria-label="Group picture" />
          <button type="button" className={rowButton} disabled={busy} onClick={() => editor.fileInputRef.current?.click()}>
            <Camera className="mr-1.5 h-4 w-4" aria-hidden />
            {avatarUrl ? "Change picture" : "Add picture"}
          </button>
          {avatarUrl ? (
            <button type="button" className={dangerGhostButton} disabled={busy} onClick={() => void editor.removePicture()}>
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
              Remove picture
            </button>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 id={descriptionId} className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">
            Description
          </h4>
          {editable && !editor.editingDescription ? (
            <button type="button" className={rowButton} onClick={editor.startEditingDescription}>
              {description ? "Edit" : "Add a description"}
            </button>
          ) : null}
        </div>
        {editor.editingDescription ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <textarea
              value={editor.descriptionDraft}
              maxLength={GROUP_DESCRIPTION_MAX}
              rows={4}
              autoFocus
              aria-labelledby={descriptionId}
              aria-describedby={counterId}
              onChange={(event) => editor.setDescriptionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  editor.cancelEditingDescription();
                }
              }}
              className={`${fieldControl} min-h-[110px] resize-y py-3 text-sm leading-[1.6]`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id={counterId} className="text-xs text-tl-faint" aria-live="polite">
                {editor.descriptionDraft.length}/{GROUP_DESCRIPTION_MAX}
              </span>
              <span className="flex gap-2">
                <button type="button" className={rowButton} onClick={editor.cancelEditingDescription}>
                  Cancel
                </button>
                <button type="button" className={primaryButton} disabled={busy} onClick={() => void editor.saveDescription()}>
                  {saving === "description" ? "Saving…" : "Save"}
                </button>
              </span>
            </div>
          </div>
        ) : (
          <p className={`mt-1.5 whitespace-pre-line break-words text-sm leading-[1.6] ${description ? "text-tl-body" : "text-tl-faint"}`}>
            {description || "No description yet."}
          </p>
        )}
      </div>

      {editor.error ? (
        <p role="alert" className="rounded-xl bg-tl-danger-bg px-3 py-2 text-[13px] font-bold text-tl-danger">
          {editor.error}
        </p>
      ) : null}

      {canLeave ? (
        <button type="button" className={`${ghostButton} self-start`} disabled={busy} onClick={() => void editor.leaveGroup()}>
          <LogOut className="h-4 w-4" aria-hidden />
          {saving === "leave" ? "Leaving…" : "Leave group"}
        </button>
      ) : null}
    </section>
  );
}
