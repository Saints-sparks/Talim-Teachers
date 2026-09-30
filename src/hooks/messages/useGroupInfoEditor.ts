"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import { fileKind, validateFile } from "@/components/chat-kit";
import { errorMessage } from "@/components/messages/helpers";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/app/lib/chat/groupPermissions";
import {
  removeChatParticipant,
  updateChatRoom,
  uploadChatAttachment,
} from "@/app/services/chat.service";

/** What a group member who isn't an admin is told when the server refuses a change (403). */
export const GROUP_ADMIN_ONLY_MESSAGE = "Only a group admin can change the group's name, description or picture.";

/** Which save is in flight (drives spinners and disables the other controls). */
export type GroupSaving = "name" | "description" | "avatar" | "leave" | null;

/** The room fields a group manager can change. */
export interface GroupDetailsPatch {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
}

/** Inputs for {@link useGroupInfoEditor}. */
export interface GroupInfoEditorOptions {
  /** Whether the info modal is open; every open starts with nothing in edit mode. */
  isOpen: boolean;
  roomId: string;
  /** The room's saved name (not the fallback), to skip saving an unchanged name. */
  savedName: string | undefined;
  /** The description as shown (empty string when none). */
  description: string;
  /** The name as shown, used in the leave prompt and toast. */
  displayName: string;
  currentUserId: string | null;
  onClose: () => void;
  /** Applies saved details to the local room list. */
  applyRoomDetails: (roomId: string, details: GroupDetailsPatch) => void;
  /** Removes the room from the local list once the user has left it. */
  dropRoom: (roomId: string, options?: { byMe?: boolean }) => void;
}

/**
 * Editing state and actions for the group details in the info modal:
 * rename, change the description (up to 500 characters), upload or remove
 * the picture, and leave the group, through `PATCH /chat/rooms/:id`. Only
 * group admins see these controls; a 403 (not, or no longer, an admin) is
 * explained inline and hides them. Every save clears its `saving` flag in a
 * `finally`, so a failed request never leaves a spinner running.
 *
 * @param options - The room, the values it shows, and the callbacks to run after a save.
 * @returns Draft values, edit-mode flags, the in-flight save, the picture input ref and the handlers.
 */
export function useGroupInfoEditor({
  isOpen,
  roomId,
  savedName,
  description,
  displayName,
  currentUserId,
  onClose,
  applyRoomDetails,
  dropRoom,
}: GroupInfoEditorOptions) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [saving, setSaving] = useState<GroupSaving>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Every open starts with nothing in edit mode.
  useEffect(() => {
    if (!isOpen) return;
    setEditingName(false);
    setEditingDescription(false);
    setError(null);
    setForbidden(false);
  }, [isOpen]);

  /**
   * Sends one change through `PATCH /chat/rooms/:id` and applies it locally.
   *
   * @param field - Which save is in flight.
   * @param payload - The fields to change.
   * @param success - The toast on success.
   * @returns Whether it saved.
   */
  const save = async (
    field: "name" | "description" | "avatar",
    payload: GroupDetailsPatch,
    success: string,
  ) => {
    setSaving(field);
    setError(null);
    try {
      await updateChatRoom(roomId, payload);
      applyRoomDetails(roomId, payload);
      toast.success(success);
      return true;
    } catch (failure) {
      // 403: I'm not (or no longer) a group admin. Say so, leave edit mode and hide the controls.
      if (failure instanceof ApiError && (failure.status === 403 || failure.code === "FORBIDDEN")) {
        setForbidden(true);
        setEditingName(false);
        setEditingDescription(false);
        setError(GROUP_ADMIN_ONLY_MESSAGE);
        toast.error(GROUP_ADMIN_ONLY_MESSAGE);
        return false;
      }
      const message = errorMessage(failure) || "Couldn't update the group";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const trimmedName = nameDraft.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= GROUP_NAME_MAX;

  const saveName = async () => {
    if (!nameValid) return;
    if (trimmedName === savedName) {
      setEditingName(false);
      return;
    }
    if (await save("name", { name: trimmedName }, "Group name updated")) setEditingName(false);
  };

  const saveDescription = async () => {
    const next = descriptionDraft.trim();
    if (next.length > GROUP_DESCRIPTION_MAX) return;
    if (next === description) {
      setEditingDescription(false);
      return;
    }
    if (await save("description", { description: next || null }, "Description updated")) {
      setEditingDescription(false);
    }
  };

  const handlePicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (fileKind(file) !== "image") {
      toast.error("Choose an image file for the group picture.");
      return;
    }
    const invalid = validateFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    let url: string;
    setSaving("avatar");
    try {
      const uploaded = await uploadChatAttachment(file);
      if (uploaded.type && uploaded.type !== "image") {
        throw new Error("Choose an image file for the group picture.");
      }
      url = uploaded.url;
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't upload the picture");
      return;
    } finally {
      setSaving(null);
    }
    await save("avatar", { avatarUrl: url }, "Group picture updated");
  };

  const removePicture = async () => {
    if (!window.confirm("Remove the group picture?")) return;
    await save("avatar", { avatarUrl: null }, "Group picture removed");
  };

  const leaveGroup = async () => {
    if (!currentUserId) return;
    if (!window.confirm(`Leave ${displayName}? You won't get its messages any more.`)) return;
    setSaving("leave");
    try {
      await removeChatParticipant(roomId, currentUserId);
      toast.success(`You left ${displayName}`);
      onClose();
      dropRoom(roomId, { byMe: true });
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't leave the group");
    } finally {
      setSaving(null);
    }
  };

  const startEditingName = () => {
    setError(null);
    setNameDraft(displayName);
    setEditingName(true);
  };

  const startEditingDescription = () => {
    setError(null);
    setDescriptionDraft(description);
    setEditingDescription(true);
  };

  return {
    saving,
    /** The last save's failure, shown inline (`role="alert"`). */
    error,
    /** The server refused a change with 403: the edit controls are hidden until the modal reopens. */
    forbidden,
    fileInputRef,
    editingName,
    nameDraft,
    setNameDraft,
    trimmedName,
    nameValid,
    startEditingName,
    cancelEditingName: () => setEditingName(false),
    saveName,
    editingDescription,
    descriptionDraft,
    setDescriptionDraft,
    startEditingDescription,
    cancelEditingDescription: () => setEditingDescription(false),
    saveDescription,
    handlePicture,
    removePicture,
    leaveGroup,
  };
}

/** What {@link useGroupInfoEditor} returns; the overview sections take it as one prop. */
export type GroupInfoEditor = ReturnType<typeof useGroupInfoEditor>;
