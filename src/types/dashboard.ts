import type { ReactNode } from "react";
export interface MetricCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  link: string;
}

export interface ScheduleItem {
  subject: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleTimelineProps {
  schedule: ScheduleItem[];
  currentTime: string;
}

export interface DashboardProps {
  metrics: {
    subjects: number;
    gradeScore: number;
    attendancePercentage: number;
  };
}

export interface TeacherKPIs {
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  userAvatar?: string;
  assignedSubjects: number;
  addedResources: number;
  recordedAttendance: number;
  assignedClasses: number;
  totalStudents: number;
  specialization: string;
  yearsOfExperience: number;
}
