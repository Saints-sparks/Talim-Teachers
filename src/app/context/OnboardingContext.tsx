"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

export const TEACHER_ONBOARDING_STEPS: TeacherOnboardingStep[] = [
  {
    id: "teacher-profile",
    label: "Confirm Profile",
    description: "Review your personal details and teacher information.",
    required: true,
    phase: 1,
    deps: [],
    href: "/onboarding",
  },
  {
    id: "upload-resource",
    label: "Upload First Resource",
    description: "Share your first learning material with a class or course.",
    required: true,
    phase: 2,
    deps: [],
    href: "/resources",
  },
  {
    id: "mark-attendance",
    label: "Enter First Attendance",
    description: "Record attendance for one of your assigned classes.",
    required: true,
    phase: 2,
    deps: [],
    href: "/attendance",
  },
  {
    id: "view-notifications",
    label: "View Notifications",
    description: "Open school announcements and updates.",
    required: true,
    phase: 2,
    deps: [],
    href: "/notifications",
  },
  {
    id: "create-curriculum",
    label: "Create First Curriculum",
    description: "Create curriculum content for an assigned course.",
    required: true,
    phase: 2,
    deps: [],
    href: "/curriculum",
  },
  {
    id: "create-group-chat",
    label: "Create First Group Chat",
    description: "Start a class or course group chat.",
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

const storageKey = (userId: string) => `teacher_onboarding_${userId}`;

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

const saveState = (userId: string, state: TeacherOnboardingState) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
};

export const TeacherOnboardingProvider: React.FC<{
  children: React.ReactNode;
  userId?: string | null;
}> = ({ children, userId }) => {
  const [state, setState] = useState<TeacherOnboardingState>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setState(defaultState);
      setIsHydrated(true);
      return;
    }

    setIsHydrated(false);
    const local = loadState(userId);
    setState(local);
    setIsHydrated(true);
  }, [userId]);

  const updatePersistedState = useCallback(
    (
      updater: (
        current: TeacherOnboardingState
      ) => TeacherOnboardingState
    ) => {
      setState((current) => {
        const next = updater(current);
        if (userId) saveState(userId, next);
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
