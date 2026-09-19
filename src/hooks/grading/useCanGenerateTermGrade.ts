"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useAppContext } from "@/app/context/AppContext";
import { resolveId } from "@/app/services/grading-workspace/grading-workspace.service";
import { canGenerateTermGrade } from "./studentCourseGrades.helpers";

/**
 * Whether the signed-in teacher may generate term grades for a class — the
 * class teacher of it, or a sub-admin (whose permissions the server checks).
 * See {@link canGenerateTermGrade} for the backend rule this mirrors.
 *
 * @param classId - The class the student belongs to.
 * @returns True when the "Generate Term Grade" action should be offered.
 */
export function useCanGenerateTermGrade(classId: string): boolean {
  const { user } = useAuth();
  const { teacherData } = useAppContext();

  const classTeacherClassIds = (teacherData?.classTeacherClasses ?? []).map((c) => resolveId(c));
  return canGenerateTermGrade({ role: user?.role, classId, classTeacherClassIds });
}
