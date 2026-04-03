export type AttendanceStatus = "present" | "absent";

export interface AttendanceRecord {
  id: string;
  name: string;
  date: string;
  status?: AttendanceStatus;
  isAbsent?: boolean;
  reasonForAbsence?: string;
  isSubmitted?: boolean;
}
