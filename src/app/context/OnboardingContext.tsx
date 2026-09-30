"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { uploadResourceRoute } from "@/hooks/today/today.routes";

export type TeacherOnboardingStepId =
  | "teacher-profile"
  | "upload-resource"
  | "mark-attendance"
  | "view-notifications"
  | "create-curriculum"
  | "create-group-chat";

export interface TeacherOnboardingStep {
  id: TeacherOnboardingStepId;
  label: string;
  description: string;
  required: boolean;
  phase: 1 | 2;
  deps: TeacherOnboardingStepId[];
  href: string;
}

/** The first-run steps, in order: the profile (phase 1), then the five first tasks (phase 2). */
export const TEACHER_ONBOARDING_STEPS: TeacherOnboardingStep[] = [
  {
    id: "teacher-profile",
    label: "Confirm your profile",
    description: "Check the details the school office has on record, and add a photo.",
    required: true,
    phase: 1,
    deps: [],
    href: "/onboarding",
  },
  {
    id: "upload-resource",
    label: "Upload a resource",
    description: "Share a worksheet, slides or a video with one of your classes in Subjects.",
    required: true,
    phase: 2,
    deps: [],
    href: uploadResourceRoute(),
  },
  {
    id: "mark-attendance",
    label: "Mark a register",
    description: "Take the morning register for one of your classes in Attendance.",
    required: true,
    phase: 2,
    deps: [],
    href: "/attendance",
  },
  {
    id: "view-notifications",
    label: "Read your notifications",
    description: "Open the school's announcements and your deadlines.",
    required: true,
    phase: 2,
    deps: [],
    href: "/notifications",
  },
  {
    id: "create-curriculum",
    label: "Write a curriculum",
    description: "Write the curriculum students read for one of your subjects.",
    required: true,
    phase: 2,
    deps: [],
    href: "/curriculum",
  },
  {
    id: "create-group-chat",
    label: "Start a group chat",
    description: "Start a group chat for a class or a subject in Messages.",
    required: true,
    phase: 2,
    deps: [],
    href: "/messages",
  },
];

interface TeacherOnboardingState {
  completedSteps: TeacherOnboardingStepId[];
  phase1Completed: boolean;
  setupDismissed: boolean;
}

interface TeacherOnboardingContextType {
  completedSteps: TeacherOnboardingStepId[];
  phase1Completed: boolean;
  setupDismissed: boolean;
  isHydrated: boolean;
  isStepComplete: (id: TeacherOnboardingStepId) => boolean;
  isStepLocked: (id: TeacherOnboardingStepId) => boolean;
  markStepComplete: (id: TeacherOnboardingStepId) => void;
  completePhase1: () => void;
  dismissSetup: () => void;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  requiredRemaining: TeacherOnboardingStep[];
  isFullyComplete: boolean;
}

const TeacherOnboardingContext = createContext<
  TeacherOnboardingContextType | undefined
>(undefined);

/**
 * The first-run checklist: which steps are done, progress, and the actions
 * that tick steps, complete the profile step and dismiss the setup prompt.
 *
 * @returns The onboarding state and actions.
 * @throws When used outside {@link TeacherOnboardingProvider}.
 */
export const useTeacherOnboarding = () => {
  const ctx = useContext(TeacherOnboardingContext);
  if (!ctx) {
    throw new Error(
      "useTeacherOnboarding must be used within TeacherOnboardingProvider"
    );
  }
  return ctx;
};

const defaultState: TeacherOnboardingState = {
  completedSteps: [],
  phase1Completed: false,
  setupDismissed: false,
};

/**
 * The per-teacher storage key of the checklist.
 *
 * @param userId - The teacher.
 * @returns The localStorage key.
 */
const storageKey = (userId: string) => `teacher_onboarding_${userId}`;

/**
 * Reads a teacher's checklist from this device, falling back to a fresh one.
 *
 * @param userId - The teacher.
 * @returns The stored state, or the default.
 */
const loadState = (userId: string): TeacherOnboardingState => {
  if (typeof window === "undefined") return defaultState;

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      return { ...defaultState, ...JSON.parse(raw) };
    }
  } catch {
    // ignore malformed local state
  }

  return defaultState;
};

/**
 * Writes a teacher's checklist to this device; a storage failure is ignored.
 *
 * @param userId - The teacher.
 * @param state - The state to keep.
 */
const saveState = (userId: string, state: TeacherOnboardingState) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
};

/**
 * Two records of one teacher's checklist as one: progress only ever grows
 * (steps are added, the flags only turn on), so nothing either holds is lost.
 *
 * @param a - One record.
 * @param b - The other.
 * @returns Every step in either, and each flag set in either.
 */
const mergeProgress = (a: TeacherOnboardingState, b: TeacherOnboardingState): TeacherOnboardingState => ({
  completedSteps: Array.from(new Set([...a.completedSteps, ...b.completedSteps])),
  phase1Completed: a.phase1Completed || b.phase1Completed,
  setupDismissed: a.setupDismissed || b.setupDismissed,
});

/**
 * Holds the signed-in teacher's first-run checklist, kept per teacher in
 * localStorage (`teacher_onboarding_<userId>`).
 *
 * @param props - The provider's props.
 * @param props.children - The app.
 * @param props.userId - The signed-in teacher, or null when signed out.
 * @returns The provider.
 */
export const TeacherOnboardingProvider: React.FC<{
  children: React.ReactNode;
  userId?: string | null;
}> = ({ children, userId }) => {
  const [state, setState] = useState<TeacherOnboardingState>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  // Whose checklist `state` holds (set when it is loaded).
  const ownerRef = useRef<string | null>(null);

  useEffect(() => {
    ownerRef.current = userId ?? null;
    if (!userId) {
      setState(defaultState);
      setIsHydrated(true);
      return;
    }

    setIsHydrated(false);
    // Read when the update is applied, after any update queued before it has saved its step.
    setState(() => loadState(userId));
    setIsHydrated(true);
  }, [userId]);

  const updatePersistedState = useCallback(
    (
      updater: (
        current: TeacherOnboardingState
      ) => TeacherOnboardingState
    ) => {
      setState((current) => {
        if (!userId) return updater(current);
        // A step can be ticked before this teacher's saved checklist is loaded: on sign-in the
        // onboarding sync (a child) runs its effect before this provider's. Build on what is
        // saved, so that tick never overwrites a checklist finished earlier on this device.
        const saved = loadState(userId);
        const base = ownerRef.current === userId ? mergeProgress(current, saved) : saved;
        const next = updater(base);
        saveState(userId, next);
        return next;
      });
    },
    [userId]
  );

  const isStepComplete = useCallback(
    (id: TeacherOnboardingStepId) => state.completedSteps.includes(id),
    [state.completedSteps]
  );

  const isStepLocked = useCallback(
    (id: TeacherOnboardingStepId) => {
      const step = TEACHER_ONBOARDING_STEPS.find((s) => s.id === id);
      if (!step) return false;
      return step.deps.some((dep) => !state.completedSteps.includes(dep));
    },
    [state.completedSteps]
  );

  const markStepComplete = useCallback(
    (id: TeacherOnboardingStepId) => {
      updatePersistedState((current) => {
        if (current.completedSteps.includes(id)) return current;

        return {
          ...current,
          completedSteps: [...current.completedSteps, id],
          phase1Completed:
            id === "teacher-profile" ? true : current.phase1Completed,
        };
      });
    },
    [updatePersistedState]
  );

  const completePhase1 = useCallback(() => {
    updatePersistedState((current) => {
      const completedSteps = Array.from(
        new Set([...current.completedSteps, "teacher-profile" as const])
      );
      return { ...current, completedSteps, phase1Completed: true };
    });
  }, [updatePersistedState]);

  const dismissSetup = useCallback(() => {
    updatePersistedState((current) => ({ ...current, setupDismissed: true }));
  }, [updatePersistedState]);

  const requiredSteps = useMemo(
    () => TEACHER_ONBOARDING_STEPS.filter((s) => s.required),
    []
  );
  const completedCount = state.completedSteps.length;
  const totalCount = TEACHER_ONBOARDING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const requiredRemaining = requiredSteps.filter(
    (s) => !state.completedSteps.includes(s.id)
  );
  const isFullyComplete = requiredRemaining.length === 0;

  return (
    <TeacherOnboardingContext.Provider
      value={{
        completedSteps: state.completedSteps,
        phase1Completed: state.phase1Completed,
        setupDismissed: state.setupDismissed,
        isHydrated,
        isStepComplete,
        isStepLocked,
        markStepComplete,
        completePhase1,
        dismissSetup,
        progressPercent,
        completedCount,
        totalCount,
        requiredRemaining,
        isFullyComplete,
      }}
    >
      {children}
    </TeacherOnboardingContext.Provider>
  );
};
