"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Search, UserMinus, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/CustomToast";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import type { ChatParticipant, ChatRoomData } from "@/app/hooks/useWebSocket";
import { roleLabel } from "@/app/lib/chat/groupPermissions";
import { getAllStudentsByClass } from "@/app/services/api.service";
import { addChatParticipants, removeChatParticipant } from "@/app/services/chat.service";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";
import { errorMessage, idOf, type ClassRecord, type CourseRecord } from "./helpers";
import type { Student } from "@/types/student";

interface GroupMembersProps {
  roomId: string;
  room: ChatRoomData | null;
  participants: ChatParticipant[];
  currentUserId: string | null;
  canManage: boolean;
}

const participantId = (p: ChatParticipant) => p.userId ?? p._id;
const fullName = (p: { firstName?: string; lastName?: string }) =>
  `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown User";

function PersonAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <Avatar className="w-10 h-10 rounded-full flex-shrink-0">
      <AvatarImage src={src || undefined} alt="" />
      <AvatarFallback
        className="text-white font-medium text-sm"
        style={{ backgroundColor: generateColorFromString(name) }}
      >
        {getUserInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex items-center border border-[#F0F0F0] px-2 rounded-lg">
      <Search strokeWidth={1.5} size={18} className="text-[#898989]" />
      <input
        type="text"
        value={value}
        placeholder="Search"
        aria-label="Search"
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent p-2 text-sm focus:outline-none"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")}>
          <X className="text-gray-500" size={16} />
        </button>
      )}
    </div>
  );
}

/** The group's real members; managers can remove members and add students. */
export default function GroupMembers({
  roomId,
  room,
  participants,
  currentUserId,
  canManage,
}: GroupMembersProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const memberIds = useMemo(() => new Set(participants.map(participantId)), [participants]);

  const members = useMemo(() => {
    const term = query.trim().toLowerCase();
    return participants
      .filter((p) => !term || fullName(p).toLowerCase().includes(term))
      .sort((a, b) => {
        // Me first, then online, then by name.
        if (participantId(a) === currentUserId) return -1;
        if (participantId(b) === currentUserId) return 1;
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return fullName(a).localeCompare(fullName(b));
      });
  }, [participants, query, currentUserId]);

  const removeMember = async (participant: ChatParticipant) => {
    const name = fullName(participant);
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    const userId = participantId(participant);
    setRemovingId(userId);
    try {
      await removeChatParticipant(roomId, userId);
      toast.success(`Removed ${name}`);
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't remove this member");
    } finally {
      setRemovingId(null);
    }
  };

  if (adding) {
    return (
      <AddStudents
        roomId={roomId}
        room={room}
        memberIds={memberIds}
        onDone={() => setAdding(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBox value={query} onChange={setQuery} />
        </div>
        {canManage && (
          <Button
            size="sm"
            className="h-10 bg-[#003366] hover:bg-[#002244]"
            onClick={() => setAdding(true)}
          >
            <UserPlus size={16} className="mr-1" />
            Add students
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#7B7B7B]">
          {query ? "No members match your search" : "No members yet"}
        </p>
      ) : (
        <ul className="flex flex-col">
          {members.map((participant) => {
            const id = participantId(participant);
            const name = fullName(participant);
            const isMe = id === currentUserId;
            return (
              <li key={id} className="flex items-center gap-3 rounded p-2 hover:bg-gray-50">
                <div className="relative">
                  <PersonAvatar name={name} src={participant.userAvatar} />
                  {participant.isOnline && (
                    <span
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500"
                      aria-label="Online"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#030E18]">
                    {name}
                    {isMe && <span className="text-[#7B7B7B]"> (You)</span>}
                  </p>
                  <p className="text-xs text-[#7B7B7B]">
                    {roleLabel(participant.role)}
                    {participant.isOnline ? " · Online" : ""}
                  </p>
                </div>
                {canManage && !isMe && (
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    title="Remove from group"
                    disabled={removingId !== null}
                    onClick={() => removeMember(participant)}
                    className="rounded-full p-2 text-[#878787] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {removingId === id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserMinus size={16} />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface AddStudentsProps {
  roomId: string;
  room: ChatRoomData | null;
  memberIds: Set<string>;
  onDone: () => void;
}

/** Picks students from the teacher's classes who aren't in the group yet. */
function AddStudents({ roomId, room, memberIds, onDone }: AddStudentsProps) {
  const { classes, courses } = useAppContext();
  const { getAccessToken } = useAuth();

  const classOptions = useMemo(
    () =>
      ((classes || []) as ClassRecord[])
        .map((c) => ({ id: idOf(c), name: c?.name || "Class" }))
        .filter((c: { id: string }) => c.id),
    [classes],
  );

  // Start on the group's own class when there is one.
  const initialClassId = useMemo(() => {
    if (room?.classId) return room.classId;
    if (room?.courseId) {
      const course = ((courses || []) as CourseRecord[]).find((c) => idOf(c) === room.courseId);
      if (course?.classId) return idOf(course.classId);
    }
    return classOptions[0]?.id || "";
  }, [room, courses, classOptions]);

  const [classId, setClassId] = useState(initialClassId);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classId && initialClassId) setClassId(initialClassId);
  }, [classId, initialClassId]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSelected(new Set());
    const token = getAccessToken() || "";
    getAllStudentsByClass(classId, token)
      .then((list) => {
        if (!cancelled) setStudents(list);
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          setLoadError("Couldn't load students for this class.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, getAccessToken]);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students
      .map((student) => {
        // The API populates `userId`, but tolerate a bare id string.
        const raw: unknown = student?.userId;
        const user: { firstName?: string; lastName?: string; userAvatar?: string } =
          raw && typeof raw === "object" ? raw : {};
        return {
          id: idOf(raw),
          name: fullName(user),
          avatar: user.userAvatar,
        };
      })
      .filter((s) => s.id && !memberIds.has(s.id))
      .filter((s) => !term || s.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, memberIds, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Someone already added (e.g. by another manager) is no longer selectable.
  const selectedIds = Array.from(selected).filter((id) => !memberIds.has(id));

  const add = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await addChatParticipants(roomId, selectedIds);
      toast.success(
        selectedIds.length === 1 ? "Added 1 student" : `Added ${selectedIds.length} students`,
      );
      onDone();
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't add members");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="p-2" onClick={onDone} aria-label="Back to members">
          <ArrowLeft size={16} />
        </Button>
        <p className="font-medium text-[#030E18]">Add students</p>
      </div>

      {classOptions.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#7B7B7B]">
          You don&apos;t have any classes to add students from.
        </p>
      ) : (
        <>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Class"
            className="w-full rounded-lg border border-[#F0F0F0] bg-white p-2 text-sm focus:border-[#003366] focus:outline-none"
          >
            {classOptions.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <SearchBox value={query} onChange={setQuery} />

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-[#7B7B7B]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#003366]" />
                Loading students...
              </div>
            ) : loadError ? (
              <p className="py-8 text-center text-sm text-red-600">{loadError}</p>
            ) : candidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7B7B7B]">
                {query
                  ? "No students match your search"
                  : "Everyone in this class is already in the group"}
              </p>
            ) : (
              <ul className="flex flex-col">
                {candidates.map((student) => (
                  <li key={student.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#003366]"
                        checked={selected.has(student.id)}
                        onChange={() => toggle(student.id)}
                      />
                      <PersonAvatar name={student.name} src={student.avatar} />
                      <span className="truncate text-sm text-[#030E18]">{student.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-[#F0F0F0] pt-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          className="bg-[#003366] hover:bg-[#002244]"
          disabled={selectedIds.length === 0 || saving}
          onClick={add}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedIds.length > 0 ? `Add ${selectedIds.length}` : "Add"}
        </Button>
      </div>
    </div>
  );
}
