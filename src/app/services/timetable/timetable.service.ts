/**
 * Timetable endpoints. `GET /timetable/teacher/:teacherId` answers with the
 * teacher's week grouped by day (`{ Monday: [...], Tuesday: [...] }`), or an
 * empty object when nothing is scheduled.
 */
import { api } from "@/lib/apiClient";

/** One scheduled lesson as `TimetableService.getTimetableByTeacher` formats it. */
export interface TimetableEntry {
  _id?: string;
  /** `"08:00 - 09:00"`, built by the server from the two times below. */
  time?: string;
  startTime?: string;
  /** The server also sends the start time under this misspelt key; kept for older payloads. */
  startTIme?: string;
  endTime?: string;
  courseId?: string;
  subjectId?: string;
  classId?: string;
  /** Course title. */
  course?: string;
  /** Subject name, or "N/A". */
  subject?: string;
  /** Class name, or "N/A". */
  class?: string;
}

/** A teacher's week, keyed by weekday name. Days with no lessons are absent. */
export type TimetableByDay = Record<string, TimetableEntry[]>;

export const timetableService = {
  /**
   * A teacher's weekly timetable.
   *
   * @param teacherId - The teacher's user id (the server also accepts the teacher record id).
   * @returns The week grouped by day; empty when nothing is scheduled.
   * @throws ApiError when the timetable cannot be read.
   */
  getForTeacher: (teacherId: string): Promise<TimetableByDay> => api.get<TimetableByDay>(`/timetable/teacher/${teacherId}`),
};
