"use client";
import { useEffect, useState } from "react";
import { Images, Info, Users } from "lucide-react";
import { useChat } from "@/app/context/ChatContext";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import { useAuth } from "@/app/hooks/useAuth";
import { canLeaveGroup, canManageGroup } from "@/app/lib/chat/groupPermissions";
import { useGroupInfoEditor } from "@/hooks/messages/useGroupInfoEditor";
import GroupMembers from "./GroupMembers";
import GroupMedia from "./GroupMedia";
import GroupInfoOverview from "./GroupInfoOverview";
import ChatInfoDialog from "./ChatInfoDialog";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  /** The name the header resolved (e.g. the class name for an unnamed class group). */
  fallbackName: string;
}

type Tab = "info" | "members" | "media";

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

  // Every open starts on the overview.
  useEffect(() => {
    if (!isOpen) return;
    setTab("info");
  }, [isOpen]);

  const editor = useGroupInfoEditor({
    isOpen,
    roomId,
    savedName: room?.name,
    description,
    displayName: name,
    currentUserId,
    onClose,
    applyRoomDetails,
    dropRoom,
  });

  const onlineCount = participants.filter((p) => p.isOnline).length;
  const summary = `${TYPE_LABELS[room?.type || ""] || "Group"} · ${participants.length} ${
    participants.length === 1 ? "member" : "members"
  }${onlineCount > 0 ? ` · ${onlineCount} online` : ""}`;

  return (
    <ChatInfoDialog
      open={isOpen}
      onClose={onClose}
      title="Group info"
      className="sm:max-w-lg"
      header={
        <div className="flex gap-2 pt-2 overflow-x-auto" role="tablist">
          {(
            [
              { id: "info", label: "Overview", icon: Info },
              { id: "members", label: `Members (${participants.length})`, icon: Users },
              { id: "media", label: "Media", icon: Images },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
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
      }
    >
      {tab === "info" ? (
        <GroupInfoOverview
          editor={editor}
          name={name}
          description={description}
          avatarUrl={avatarUrl}
          canManage={canManage}
          canLeave={canLeave}
          summary={summary}
        />
      ) : tab === "media" ? (
        <GroupMedia messages={thread.messages} />
      ) : (
        <GroupMembers
          roomId={roomId}
          room={room}
          participants={participants}
          currentUserId={currentUserId}
          canManage={canManage}
        />
      )}
    </ChatInfoDialog>
  );
}
