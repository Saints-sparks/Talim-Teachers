"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/CustomToast";
import { fileKind, validateFile } from "@/components/chat-kit";
import { errorMessage } from "@/components/messages/helpers";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX } from "@/app/lib/chat/groupPermissions";
import {
  removeChatParticipant,
  updateChatRoom,
  uploadChatAttachment,
} from "@/app/services/chat.service";

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
 * Editing state and actions for the group info overview: rename, change the
 * description, upload or remove the picture, and leave the group. Every save
 * clears its `saving` flag in a `finally`, so a failed request never leaves a
 * spinner running.
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Every open starts with nothing in edit mode.
  useEffect(() => {
    if (!isOpen) return;
    setEditingName(false);
    setEditingDescription(false);
  }, [isOpen]);

  const save = async (
    field: "name" | "description" | "avatar",
    payload: GroupDetailsPatch,
    success: string,
  ) => {
    setSaving(field);
    try {
      await updateChatRoom(roomId, payload);
      applyRoomDetails(roomId, payload);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't update the group");
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
    setNameDraft(displayName);
    setEditingName(true);
  };

  const startEditingDescription = () => {
    setDescriptionDraft(description);
    setEditingDescription(true);
  };

  return {
    saving,
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
