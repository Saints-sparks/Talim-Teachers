// New grading system types based on the backend API structure

export interface AssessmentGradeRecord {
  _id: string;
  courseId: string;
  studentId: string;
  assessmentId: string;
  recordedBy: string; // Teacher ID
  actualScore: number;
  maxScore: number;
  percentage: number;
  schoolId: string;
  classId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseGradeRecord {
  _id: string;
  courseId: string;
  studentId: string;
  termId: string;
  assessmentGradeRecords: string[]; // Array of Assessment Grade Record IDs
  gradeLevel: GradeLevel;
  cumulativeScore: number;
  maxScore: number;
  percentage: number;
  schoolId: string;
  classId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCumulativeTermGradeRecord {
  _id: string;
  classId: string;
  studentId: string;
  termId: string;
  courseGradeRecords: string[]; // Array of Course Grade Record IDs
  totalScore: number;
  percentage: number;
  grade: string;
  remarks: string;
  position: number; // Class position
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassCumulativeTermGradeRecord {
  _id: string;
  classId: string;
  termId: string;
  studentCumulativeTermGradeRecords: string[]; // Array of Student Cumulative IDs
  classAverage: number;
  totalStudents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type GradeLevel = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'E' | 'F';

// DTOs for creating/updating records
export interface CreateAssessmentGradeRecordDto {
  courseId: string;
  studentId: string;
  assessmentId: string;
  actualScore: number;
  maxScore: number;
  schoolId: string;
  classId: string;
}

export interface UpdateAssessmentGradeRecordDto {
  actualScore?: number;
  maxScore?: number;
  isActive?: boolean;
}

export interface CreateCourseGradeRecordDto {
  courseId: string;
  studentId: string;
  termId: string;
  schoolId: string;
  classId: string;
}

// Extended types for UI
export interface AssessmentGradeRecordWithDetails extends AssessmentGradeRecord {
  student?: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
  };
  assessment?: {
    _id: string;
    name: string;
    description?: string;
  };
  course?: {
    _id: string;
    title: string;
    courseCode: string;
  };
}

export interface CourseGradeRecordWithDetails extends CourseGradeRecord {
  student?: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
  };
  course?: {
    _id: string;
    title: string;
    courseCode: string;
  };
  assessmentGrades?: AssessmentGradeRecord[];
}

export interface StudentCumulativeWithDetails extends StudentCumulativeTermGradeRecord {
  student?: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
  };
  courseGrades?: CourseGradeRecordWithDetails[];
}

// Analytics and summary types
export interface ClassPerformanceStats {
  totalStudents: number;
  averageGrade: number;
  topPerformers: number;
  needsAttention: number;
  subjectsCount: number;
  activeAssessments: number;
  gradeDistribution: {
    [key in GradeLevel]: number;
  };
}

export interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  studentNumber: string;
  overallPercentage: number;
  overallGrade: GradeLevel;
  position: number;
  courseGrades: Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
    percentage: number;
    gradeLevel: GradeLevel;
    assessmentCount: number;
  }>;
}

// API Response types
export interface GradeRecordsApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkGradeResult {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    studentId: string;
    error: string;
  }>;
}
