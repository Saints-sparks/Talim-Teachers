"use client";

/**
 * Data hooks of the redesigned Messages page (Round 4): the "New message"
 * picker's contacts (§26), opening a conversation with a person or with the
 * school office (§28), a class group (the existing `POST /chat/groups`
 * `class_group` flow, which reuses the class's group when there is one), and
 * the info modal's shared media (§29). The live chat engine stays in
 * `useRealtimeChat`; these only open rooms and read extra data.
 */
import { useCallback, useState } from "react";
import { useInfiniteQuery, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useChat } from "@/app/context/ChatContext";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { messagesRoomUrl } from "@/app/hooks/useChatAlerts";
import {
  createGroupChat,
  getChatContacts,
  getRoomMedia,
  openOfficeRoom,
  startDirectChat,
  ROOM_MEDIA_PAGE_SIZE,
  type CreateGroupChatPayload,
} from "@/app/services/chat.service";
import { parseCreatedGroup } from "@/components/messages/helpers";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { OFFICE_CONTACT_ID, type ChatContact, type SharedMediaKind } from "@/types/inboxSettings";

/**
 * `GET /chat/contacts`, cached for the session's user.
 *
 * @param enabled - Only fetch while the picker is open.
 * @returns The query result.
 */
export function useChatContacts(enabled = true): UseQueryResult<ChatContact[], unknown> {
  const { user } = useAuth();
  const userId = user?.userId ?? "";
  return useQuery({
    queryKey: queryKeys.chat.contacts(userId),
    queryFn: getChatContacts,
    enabled: enabled && Boolean(userId),
    staleTime: staleTimes.reference,
  });
}

/** What {@link useStartConversation} returns. */
export interface StartConversation {
  /** Opens (or creates) the conversation and navigates to it; resolves with the room id. */
  start: (contact: Pick<ChatContact, "userId">) => Promise<string>;
  /** The contact being opened, for its busy state. */
  pendingId: string | null;
}

/**
 * Opens a conversation from the picker: a person through the existing
 * one-to-one flow (`POST /chat/rooms`, which returns the pair's room when it
 * exists), the office through `POST /chat/office`. Then `/messages?room=`.
 *
 * @returns `start` and the contact in flight.
 */
export function useStartConversation(): StartConversation {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshChatRooms } = useChat();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const me = user?.userId ?? "";

  const start = useCallback(
    async (contact: Pick<ChatContact, "userId">) => {
      setPendingId(contact.userId);
      try {
        const roomId = contact.userId === OFFICE_CONTACT_ID ? await openOfficeRoom() : await startDirectChat(contact.userId, me);
        refreshChatRooms();
        router.push(messagesRoomUrl(roomId));
        return roomId;
      } finally {
        setPendingId(null);
      }
    },
    [me, refreshChatRooms, router],
  );

  return { start, pendingId };
}

/** What {@link useClassGroup} returns. */
export interface ClassGroupOpener {
  /**
   * Creates the class's group, or reuses the one it has, and opens it.
   * Resolves with the room and whether the server reused an existing group.
   */
  open: (input: { classId: string; name?: string }) => Promise<{ roomId: string; reused: boolean }>;
  /** The class being opened. */
  pendingClassId: string | null;
}

/**
 * The class group of a class: the "New class group" sheet and the lesson
 * sheet's "Message the class" (when the lesson carries no `classRoomId`)
 * both go through the existing `POST /chat/groups` (`class_group`), which
 * answers with the class's existing group instead of making a second one.
 *
 * @returns `open` and the class in flight.
 */
export function useClassGroup(): ClassGroupOpener {
  const router = useRouter();
  const { user } = useAuth();
  const { chatRooms, refreshChatRooms } = useChat();
  const { markStepComplete } = useTeacherOnboarding();
  const term = useCurrentTerm();
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);

  const open = useCallback(
    async ({ classId, name }: { classId: string; name?: string }) => {
      const me = user?.userId;
      if (!me) throw new Error("Sign in again to start a class group.");
      setPendingClassId(classId);
      try {
        const termId = term.data?._id || (typeof term.data?.id === "string" ? term.data.id : undefined);
        const payload: CreateGroupChatPayload = {
          type: "class_group",
          classId,
          participants: [me],
          ...(termId ? { termId } : {}),
          ...(name?.trim() ? { name: name.trim() } : {}),
        };
        const response = await createGroupChat(payload);
        const created = parseCreatedGroup(response.data);
        if (!created.roomId) throw new Error("The class group could not be opened.");
        // Older servers don't say whether they reused the group; the room list does.
        const reused = created.reused ?? chatRooms.some((room) => room.roomId === created.roomId);
        refreshChatRooms();
        markStepComplete("create-group-chat");
        router.push(messagesRoomUrl(created.roomId));
        return { roomId: created.roomId, reused };
      } finally {
        setPendingClassId(null);
      }
    },
    [user?.userId, term.data, chatRooms, refreshChatRooms, markStepComplete, router],
  );

  return { open, pendingClassId };
}

/**
 * One kind of a room's shared media (§29), page by page (newest first,
 * "Load more" follows `nextCursor`). Every page carries the totals per kind.
 *
 * @param roomId - The room.
 * @param kind - Images, videos, documents or links.
 * @param enabled - Only fetch while the info modal shows this kind (or needs the counts).
 * @returns The infinite query.
 */
export function useRoomMedia(roomId: string, kind: SharedMediaKind, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.media(roomId, kind),
    queryFn: ({ pageParam }) => getRoomMedia(roomId, kind, pageParam, ROOM_MEDIA_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && Boolean(roomId),
    staleTime: staleTimes.list,
  });
}
