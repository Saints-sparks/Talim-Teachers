"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { fieldControl, fieldLabel, focusRing, ghostButton, pill, pillTone, primaryButton } from "@/components/tl/styles";
import { useAppContext } from "@/app/context/AppContext";
import type { ChatParticipant, ChatRoomData } from "@/app/hooks/useWebSocket";
import { roleLabel } from "@/app/lib/chat/groupPermissions";
import { getAllStudentsByClass } from "@/app/services/api.service";
import { addChatParticipants, removeChatParticipant } from "@/app/services/chat.service";
import type { RoomAdmin } from "@/types/inboxSettings";
import type { Student } from "@/types/student";
import { errorMessage, idOf, type ClassRecord, type CourseRecord } from "./helpers";
import { ThreadAvatar } from "./ThreadAvatar";

/** Props for {@link GroupMembers}. */
interface GroupMembersProps {
  roomId: string;
  room: ChatRoomData | null;
  participants: ChatParticipant[];
  currentUserId: string | null;
  /** I'm a group admin: I can add students and remove members. */
  canManage: boolean;
  /** The group's admins (room view `admins`), badged "Group admin". */
  admins?: RoomAdmin[];
}

const participantId = (p: ChatParticipant) => p.userId ?? p._id;
const fullName = (p: { firstName?: string; lastName?: string }) => `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown user";

/**
 * A labelled search box for the member lists.
 *
 * @param props - The value and its setter.
 * @param props.value - The search text.
 * @param props.onChange - Called with the new text.
 * @param props.label - The accessible label.
 * @returns The search field.
 */
function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const id = useId();
  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tl-faint" aria-hidden />
      <input id={id} type="search" value={value} placeholder="Search" onChange={(e) => onChange(e.target.value)} className={`${fieldControl} pl-10 text-sm`} />
    </div>
  );
}

/**
 * The conversation's members (the info modal's Members tab): me first, then
 * who is online, then by name, each with their role, presence and a "Group
 * admin" badge for the group's admins. Group admins can remove members and
 * add students from their classes.
 *
 * @param props - See {@link GroupMembersProps}.
 * @returns The member list, or the add-students picker.
 */
export default function GroupMembers({ roomId, room, participants, currentUserId, canManage, admins }: GroupMembersProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const memberIds = useMemo(() => new Set(participants.map(participantId)), [participants]);
  const adminIds = useMemo(() => new Set((admins ?? []).map((admin) => admin.id)), [admins]);

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
    return <AddStudents roomId={roomId} room={room} memberIds={memberIds} onDone={() => setAdding(false)} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchBox value={query} onChange={setQuery} label="Search members" />
        {canManage ? (
          <button type="button" className={primaryButton} onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Add students
          </button>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="py-8 text-center text-sm text-tl-muted">{query ? "No members match your search." : "No members yet."}</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((participant) => {
            const id = participantId(participant);
            const name = fullName(participant);
            const isMe = id === currentUserId;
            const isAdmin = adminIds.has(id);
            return (
              <li key={id} className="flex items-center gap-3 border-t border-tl-line-soft py-3 first:border-t-0">
                <ThreadAvatar name={name} src={participant.userAvatar} size={40} online={participant.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold text-tl-ink">
                    <span className="truncate">
                      {name}
                      {isMe ? <span className="font-semibold text-tl-muted"> (you)</span> : null}
                    </span>
                    {isAdmin ? <span className={`${pill} ${pillTone.info}`}>Group admin</span> : null}
                  </p>
                  <p className="mt-0.5 text-[13px] text-tl-muted">
                    {roleLabel(participant.role)}
                    {participant.isOnline ? " · Online" : ""}
                  </p>
                </div>
                {canManage && !isMe ? (
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    title="Remove from group"
                    disabled={removingId !== null}
                    onClick={() => void removeMember(participant)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-muted hover:bg-tl-danger-bg hover:text-tl-danger disabled:opacity-50 ${focusRing}`}
                  >
                    {removingId === id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserMinus className="h-4 w-4" aria-hidden />}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Props for {@link AddStudents}. */
interface AddStudentsProps {
  roomId: string;
  room: ChatRoomData | null;
  memberIds: Set<string>;
  onDone: () => void;
}

/**
 * Picks students from the teacher's classes who aren't in the group yet.
 *
 * @param props - See {@link AddStudentsProps}.
 * @returns The picker.
 */
function AddStudents({ roomId, room, memberIds, onDone }: AddStudentsProps) {
  const { classes, courses } = useAppContext();
  const classSelectId = useId();

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
    getAllStudentsByClass(classId)
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
  }, [classId]);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students
      .map((student) => {
        // The API populates `userId`, but tolerate a bare id string.
        const raw: unknown = student?.userId;
        const user: { firstName?: string; lastName?: string; userAvatar?: string } = raw && typeof raw === "object" ? raw : {};
        return { id: idOf(raw), name: fullName(user), avatar: user.userAvatar };
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

  // Someone already added (e.g. by another admin) is no longer selectable.
  const selectedIds = Array.from(selected).filter((id) => !memberIds.has(id));

  const add = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await addChatParticipants(roomId, selectedIds);
      toast.success(selectedIds.length === 1 ? "Added 1 student" : `Added ${selectedIds.length} students`);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't add members");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" className={`flex h-11 w-11 items-center justify-center rounded-xl border border-tl-line text-tl-brand ${focusRing}`} onClick={onDone} aria-label="Back to members">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-[15px] font-extrabold text-tl-ink">Add students</p>
      </div>

      {classOptions.length === 0 ? (
        <p className="py-8 text-center text-sm text-tl-muted">You don&apos;t have any classes to add students from.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={classSelectId} className={fieldLabel}>
              Class
            </label>
            <select id={classSelectId} value={classId} onChange={(e) => setClassId(e.target.value)} className={fieldControl}>
              {classOptions.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <SearchBox value={query} onChange={setQuery} label="Search students" />

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <p className="flex items-center justify-center py-8 text-sm text-tl-muted" role="status">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-tl-brand" aria-hidden />
                Loading students…
              </p>
            ) : loadError ? (
              <p className="py-8 text-center text-sm font-bold text-tl-danger" role="alert">
                {loadError}
              </p>
            ) : candidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-tl-muted">{query ? "No students match your search." : "Everyone in this class is already in the group."}</p>
            ) : (
              <ul className="flex flex-col">
                {candidates.map((student) => (
                  <li key={student.id}>
                    <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-tl-subtle">
                      <input type="checkbox" className="h-4 w-4 accent-tl-brand-fill" checked={selected.has(student.id)} onChange={() => toggle(student.id)} />
                      <ThreadAvatar name={student.name} src={student.avatar} size={36} />
                      <span className="truncate text-sm font-semibold text-tl-ink">{student.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-tl-line-soft pt-3">
        <button type="button" className={ghostButton} onClick={onDone}>
          Cancel
        </button>
        <button type="button" className={primaryButton} disabled={selectedIds.length === 0 || saving} onClick={() => void add()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {selectedIds.length > 0 ? `Add ${selectedIds.length}` : "Add"}
        </button>
      </div>
    </div>
  );
}
