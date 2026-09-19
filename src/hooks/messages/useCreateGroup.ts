"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/app/context/AppContext";
import { useChat } from "@/app/context/ChatContext";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { messagesRoomUrl } from "@/app/hooks/useChatAlerts";
import { useAuth } from "@/app/hooks/useAuth";
import { getCurrentTerm, type CurrentTerm } from "@/app/services/api.service";
import { createGroupChat, type CreateGroupChatPayload } from "@/app/services/chat.service";
import {
  errorMessage,
  parseCreatedGroup,
  type ClassRecord,
  type CourseRecord,
} from "@/components/messages/helpers";
import { logger } from "@/lib/logger";

/** Which screen of the create-group modal is showing. */
export type CreateGroupStep = "selection" | "class-list" | "course-list";

/** The success or error banner shown above the current step. */
export interface CreateGroupNotice {
  type: "success" | "error";
  message: string;
}

/** How long the success banner stays up before the modal closes, in ms. */
const CLOSE_DELAY_MS = 1200;

/**
 * State and actions behind the "create group chat" modal: which step is
 * showing, the search text, the current term, and creating a class or course
 * group. Loads the current term whenever the modal opens without one, and
 * resets everything when it closes.
 *
 * @param open - Whether the modal is open; the term is fetched while it is.
 * @param onOpenChange - Called with the new open state (also after a successful create).
 * @returns The step, search text, term, loading flags and notice, plus the actions that change them.
 */
export function useCreateGroup(open: boolean, onOpenChange: (open: boolean) => void) {
  const [currentStep, setCurrentStep] = useState<CreateGroupStep>("selection");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTerm, setCurrentTerm] = useState<CurrentTerm | null>(null);
  const [isLoadingTerm, setIsLoadingTerm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<CreateGroupNotice | null>(null);

  const { classes, courses, isLoading, user } = useAppContext();
  const { chatRooms, refreshChatRooms } = useChat();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const { markStepComplete } = useTeacherOnboarding();

  // Fetch current term when modal opens
  useEffect(() => {
    const fetchCurrentTerm = async () => {
      if (open && !currentTerm) {
        setIsLoadingTerm(true);
        try {
          const token = getAccessToken();
          if (!token) throw new Error("No auth token");

          const term = await getCurrentTerm(token);
          setCurrentTerm(term);
        } catch (error) {
          logger.error("messages", "Error fetching current term", error);
        } finally {
          setIsLoadingTerm(false);
        }
      }
    };

    fetchCurrentTerm();
  }, [open, currentTerm, getAccessToken]);

  const handleBack = () => {
    if (currentStep === "class-list" || currentStep === "course-list") {
      setCurrentStep("selection");
    }
  };

  const handleCreateGroup = async (item: ClassRecord | CourseRecord, type: "class" | "course") => {
    setIsCreating(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      if (!user) {
        throw new Error("User not found");
      }

      // Prepare the payload based on the DTO structure
      const payload: CreateGroupChatPayload = {
        type: type === "class" ? "class_group" : "course_group",
        termId: currentTerm?._id || (typeof currentTerm?.id === "string" ? currentTerm.id : undefined),
        participants: [user.userId], // Include current user as participant
      };

      // Add the appropriate ID based on type
      if (type === "class") {
        payload.classId = item._id || item.id;
      } else {
        payload.courseId = item._id || item.id;
      }

      const response = await createGroupChat(payload, token);
      const created = parseCreatedGroup(response.data);
      const roomId = created.roomId;
      // The server reuses an existing class/course group instead of creating a second one
      // and says so with `reused`; older servers don't, so fall back to the room list.
      const reused = created.reused ?? chatRooms.some((room) => room.roomId === roomId);

      // Refresh chat rooms after creating a group
      refreshChatRooms();
      markStepComplete("create-group-chat");

      // Show success notification
      setNotification({
        type: "success",
        message: reused
          ? "Opened the existing group"
          : `${type === "class" ? "Class" : "Course"} group chat created successfully!`,
      });

      // Open the group, then close the modal after a brief delay
      if (roomId) router.push(messagesRoomUrl(roomId));
      setTimeout(() => {
        onOpenChange(false);
        setCurrentStep("selection");
        setSearchTerm("");
        setNotification(null);
      }, CLOSE_DELAY_MS);
    } catch (error) {
      logger.error("messages", "Error creating group", error);
      setNotification({
        type: "error",
        message: `Failed to create group: ${errorMessage(error)}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Reset state when modal closes
      setCurrentStep("selection");
      setSearchTerm("");
      setCurrentTerm(null);
      setIsCreating(false);
      setNotification(null);
    }
  };

  const goToClassList = useCallback(() => setCurrentStep("class-list"), []);
  const goToCourseList = useCallback(() => setCurrentStep("course-list"), []);

  return {
    currentStep,
    goToClassList,
    goToCourseList,
    handleBack,
    searchTerm,
    setSearchTerm,
    currentTerm,
    isLoadingTerm,
    isCreating,
    notification,
    classes: classes as ClassRecord[],
    courses: courses as CourseRecord[],
    isLoading,
    handleCreateGroup,
    handleOpenChange,
  };
}
