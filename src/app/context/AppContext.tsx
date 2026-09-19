"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchTeacherDetails } from "../services/api.service";
import { useAuth } from "./AuthContext";
import { logger } from "@/lib/logger";
import type { User } from "@/types/auth";

/**
 * The teacher roster endpoints are not typed yet: every page casts the class
 * and course records to the shape it needs. Kept deliberately loose in one
 * named place (rather than `any` scattered through the file) so the page pass
 * can replace it resource by resource.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Untyped = any;

/** A class as the teacher record returns it. */
export type TeacherClass = Untyped;

/** A course as the teacher record returns it. */
export type TeacherCourse = Untyped;

/** The teacher record behind the signed-in user, with their roster. */
export interface TeacherDetails {
  _id?: string;
  classTeacherClasses?: TeacherClass[];
  assignedClasses?: TeacherClass[];
  assignedCourses?: TeacherCourse[];
  classTeacherCourses?: TeacherCourse[];
  [key: string]: unknown;
}

/** What `useAppContext()` provides. */
export interface AppContextType {
  /** The signed-in user — owned by `AuthContext`, mirrored here for convenience. */
  user: User | null;
  /** The teacher record for that user, once loaded. */
  teacherData: TeacherDetails | null;
  /** The classes this teacher is responsible for. */
  classes: TeacherClass[];
  /** Reloads the teacher record and its roster. */
  refreshClasses: () => Promise<void>;
  isLoading: boolean;
  /** The courses this teacher teaches. */
  courses: TeacherCourse[];
  /** Merges fields into the signed-in user. */
  updateUser: (updates: Partial<User>) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  teacherData: null,
  classes: [],
  refreshClasses: async () => {},
  isLoading: false,
  courses: [],
  updateUser: () => {},
});

/**
 * Loads the teacher record (classes and courses) for the signed-in user.
 *
 * The user itself is no longer stored here: `AuthContext` owns the session and
 * this context reads it, so there is one source of truth and no window event
 * keeping two copies in step.
 *
 * @param props - Standard children.
 * @param props.children - The app tree.
 * @returns The provider element.
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken, updateUser } = useAuth();

  const [teacherData, setTeacherData] = useState<TeacherDetails | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);

  const userId = user?.userId;
  // The API refuses everything but the password change until a temporary password
  // is replaced, so the record is not asked for before then.
  const mustChangePassword = Boolean(user?.mustChangePassword);

  const fetchTeacherAndClasses = useCallback(async () => {
    if (!userId || !accessToken || mustChangePassword) return;

    setIsLoading(true);
    try {
      const teacherDetails: TeacherDetails = await fetchTeacherDetails(userId, accessToken);
      setTeacherData(teacherDetails);
      setClasses(teacherDetails?.classTeacherClasses || teacherDetails?.assignedClasses || []);
      setCourses(teacherDetails?.assignedCourses || teacherDetails?.classTeacherCourses || []);
    } catch (error) {
      logger.error("app-context", "Could not load the teacher record", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, accessToken, mustChangePassword]);

  useEffect(() => {
    if (!userId) {
      setTeacherData(null);
      setClasses([]);
      setCourses([]);
      return;
    }
    fetchTeacherAndClasses();
  }, [userId, fetchTeacherAndClasses]);

  return (
    <AppContext.Provider
      value={{
        user,
        teacherData,
        classes,
        refreshClasses: fetchTeacherAndClasses,
        isLoading,
        courses,
        updateUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/**
 * The teacher record and roster for the signed-in user.
 *
 * @returns The app context value.
 */
export const useAppContext = (): AppContextType => useContext(AppContext);
