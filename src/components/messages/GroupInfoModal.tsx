"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Info, Loader2, LogOut, Pencil, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/CustomToast";
import { useChat } from "@/app/context/ChatContext";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import { useAuth } from "@/app/hooks/useAuth";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  canLeaveGroup,
  canManageGroup,
} from "@/app/lib/chat/groupPermissions";
import {
  removeChatParticipant,
  updateChatRoom,
  uploadChatAttachment,
} from "@/app/services/chat.service";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";
import GroupMembers from "./GroupMembers";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  /** The name the header resolved (e.g. the class name for an unnamed class group). */
  fallbackName: string;
}

type Tab = "info" | "members";

const TYPE_LABELS: Record<string, string> = {
  class_group: "Class group",
  course_group: "Course group",
  parent_group: "Parent group",
  admin_parent_group: "Admin and parents group",
  custom_group: "Group",
};

export default function GroupInfoModal({ isOpen, onClose, roomId, fallbackName }: GroupInfoModalProps) {
  const { chatRooms, currentUserId, dropRoom, applyRoomDetails } = useChat();
  const { user } = useAuth();
  const thread = useChatRoom(roomId);

  const listed = chatRooms.find((r) => r.roomId === roomId) ?? null;
  const room = listed ?? thread.room;
  const participants = listed?.participants?.length
    ? listed.participants
    : thread.room?.participants?.length
      ? thread.room.participants
      : thread.participants;

  const name = room?.name || fallbackName || "Group Chat";
  const description = room?.description || "";
  const avatarUrl = room?.avatarUrl || "";
  const canManage = canManageGroup(room, { id: currentUserId, role: user?.role });
  const canLeave = canLeaveGroup(room);

  const [tab, setTab] = useState<Tab>("info");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [saving, setSaving] = useState<"name" | "description" | "avatar" | "leave" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Every open starts on the overview with nothing in edit mode.
  useEffect(() => {
    if (!isOpen) return;
    setTab("info");
    setEditingName(false);
    setEditingDescription(false);
  }, [isOpen]);

  const save = async (
    field: "name" | "description" | "avatar",
    payload: { name?: string; description?: string | null; avatarUrl?: string | null },
    success: string,
  ) => {
    setSaving(field);
    try {
      await updateChatRoom(roomId, payload);
      applyRoomDetails(roomId, payload);
      toast.success(success);
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Couldn't update the group");
      return false;
    } finally {
      setSaving(null);
    }
  };

  const trimmedName = nameDraft.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= GROUP_NAME_MAX;

  const saveName = async () => {
    if (!nameValid) return;
    if (trimmedName === room?.name) {
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
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the group picture.");
      return;
    }
    setSaving("avatar");
    try {
      const uploaded = await uploadChatAttachment(file);
      if (uploaded.type && uploaded.type !== "image") {
        throw new Error("Choose an image file for the group picture.");
      }
      setSaving(null);
      await save("avatar", { avatarUrl: uploaded.url }, "Group picture updated");
    } catch (error: any) {
      toast.error(error?.message || "Couldn't upload the picture");
      setSaving(null);
    }
  };

  const removePicture = async () => {
    if (!window.confirm("Remove the group picture?")) return;
    await save("avatar", { avatarUrl: null }, "Group picture removed");
  };

  const leaveGroup = async () => {
    if (!currentUserId) return;
    if (!window.confirm(`Leave ${name}? You won't get its messages any more.`)) return;
    setSaving("leave");
    try {
      await removeChatParticipant(roomId, currentUserId);
      toast.success(`You left ${name}`);
      onClose();
      dropRoom(roomId, { byMe: true });
    } catch (error: any) {
      toast.error(error?.message || "Couldn't leave the group");
    } finally {
      setSaving(null);
    }
  };

  const onlineCount = participants.filter((p) => p.isOnline).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg font-manrope p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#F0F0F0] text-left">
          <DialogTitle className="text-base font-semibold text-[#030E18]">Group info</DialogTitle>
          <DialogDescription className="sr-only">Details and members of {name}</DialogDescription>
          <div className="flex gap-2 pt-2" role="tablist">
            {(
              [
                { id: "info", label: "Overview", icon: Info },
                { id: "members", label: `Members (${participants.length})`, icon: Users },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  tab === item.id
                    ? "bg-[#003366]/10 text-[#003366] font-medium"
                    : "text-[#878787] hover:bg-gray-100"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "info" ? (
            <div className="space-y-5">
              {/* Picture and name */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="w-20 h-20 rounded-full">
                    <AvatarImage src={avatarUrl} alt="" />
                    <AvatarFallback
                      className="text-white text-xl font-medium"
                      style={{ backgroundColor: generateColorFromString(name) }}
                    >
                      {getUserInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  {saving === "avatar" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="mt-2 flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePicture}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[#003366]"
                      disabled={saving !== null}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={14} className="mr-1" />
                      {avatarUrl ? "Change picture" : "Add picture"}
                    </Button>
                    {avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700"
                        disabled={saving !== null}
                        onClick={removePicture}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                )}

                {editingName ? (
                  <div className="mt-3 w-full">
                    <Input
                      value={nameDraft}
                      maxLength={GROUP_NAME_MAX}
                      autoFocus
                      aria-label="Group name"
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveName();
                      }}
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-[#7B7B7B]">
                      <span className={nameValid ? "" : "text-red-600"}>
                        {trimmedName.length === 0 ? "Enter a name" : `${trimmedName.length}/${GROUP_NAME_MAX}`}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#003366] hover:bg-[#002244]"
                          disabled={!nameValid || saving !== null}
                          onClick={saveName}
                        >
                          {saving === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-1">
                    <h2 className="text-lg text-[#030E18] font-medium break-words">{name}</h2>
                    {canManage && (
                      <button
                        type="button"
                        aria-label="Edit group name"
                        className="rounded p-1 text-[#878787] hover:bg-gray-100 hover:text-[#030E18]"
                        onClick={() => {
                          setNameDraft(name);
                          setEditingName(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-[#7B7B7B]">
                  {TYPE_LABELS[room?.type || ""] || "Group"} · {participants.length}{" "}
                  {participants.length === 1 ? "member" : "members"}
                  {onlineCount > 0 ? ` · ${onlineCount} online` : ""}
                </p>
              </div>

              {/* Description */}
              <div className="rounded-lg border border-[#F0F0F0] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#878787]">Description</p>
                  {canManage && !editingDescription && (
                    <button
                      type="button"
                      aria-label="Edit description"
                      className="rounded p-1 text-[#878787] hover:bg-gray-100 hover:text-[#030E18]"
                      onClick={() => {
                        setDescriptionDraft(description);
                        setEditingDescription(true);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                {editingDescription ? (
                  <div>
                    <Textarea
                      value={descriptionDraft}
                      maxLength={GROUP_DESCRIPTION_MAX}
                      rows={4}
                      autoFocus
                      aria-label="Group description"
                      className="w-full text-sm border-[#F0F0F0] focus:outline-none focus:border-[#003366]"
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-[#7B7B7B]">
                      <span>
                        {descriptionDraft.length}/{GROUP_DESCRIPTION_MAX}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#003366] hover:bg-[#002244]"
                          disabled={saving !== null}
                          onClick={saveDescription}
                        >
                          {saving === "description" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : description ? (
                  <p className="text-sm text-[#545454] whitespace-pre-line break-words">{description}</p>
                ) : (
                  <p className="text-sm text-[#A0A0A0]">No description</p>
                )}
              </div>

              {canLeave && (
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={saving !== null}
                  onClick={leaveGroup}
                >
                  {saving === "leave" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut size={16} className="mr-2" />
                  )}
                  Leave group
                </Button>
              )}
            </div>
          ) : (
            <GroupMembers
              roomId={roomId}
              room={room}
              participants={participants}
              currentUserId={currentUserId}
              canManage={canManage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
