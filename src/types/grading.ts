// Types for grading system based on backend DTOs

export interface ScoreComponent {
  assessmentType: string;
  maxScore: number;
  actualScore: number;
  weight: number;
}

export interface GradeRecord {
  _id: string;
  assessmentId: string;
  studentId: string;
  courseId: string;
  classId: string;
  scores: ScoreComponent[];
  totalScore: number;
  percentage: number;
  grade: GradeLevel;
  remarks?: string;
  teacherId: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Assessment {
  _id: string;
  name: string;
  description?: string;
  termId: string;
  startDate: string;
  endDate: string;
  status: AssessmentStatus;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export enum AssessmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum GradeLevel {
  A_PLUS = 'A+',
  A = 'A',
  B_PLUS = 'B+',
  B = 'B',
  C_PLUS = 'C+',
  C = 'C',
  D_PLUS = 'D+',
  D = 'D',
  E = 'E',
  F = 'F'
}

export interface Student {
  _id: string;
  name: string;
  studentId: string;
  email: string;
  classId: string;
  avatar?: string;
}

export interface Class {
  _id: string;
  name: string;
  level: string;
  schoolId: string;
}

export interface CreateGradeRecord {
  assessmentId: string;
  studentId: string;
  courseId: string;
  classId: string;
  scores: ScoreComponent[];
  remarks?: string;
}

export interface UpdateGradeRecord {
  scores?: ScoreComponent[];
  remarks?: string;
}

export interface GradeAnalytics {
  studentId: string;
  termId?: string;
  overallAverage: number;
  overallGrade: GradeLevel;
  totalCourses: number;
  totalAssessments: number;
  courseAnalytics: CourseAnalytics[];
  generatedAt: string;
}

export interface CourseAnalytics {
  _id: string;
  courseName: string;
  courseCode: string;
  grades: GradeDetail[];
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  totalAssessments: number;
  averageGrade: GradeLevel;
}

export interface GradeDetail {
  assessmentName: string;
  percentage: number;
  grade: GradeLevel;
  totalScore: number;
  createdAt: string;
}

export interface AssessmentGrade {
  _id: string;
  assessmentId: string;
  studentId: string;
  courseId: string;
  score: number;
  maxScore: number;
  percentage: number;
  assessmentType: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
