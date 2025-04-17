export interface StudentContact {
  phoneNumber: string;
  emailAddress: string;
}

export interface Guardian {
  name: string;
  contactDetails: string;
}

export interface Parent {
  name: string;
  contactDetails: string;
}

// /src/types/student.ts

export interface User {
  _id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface Class {
  _id: string;
  name: string;
}

export interface ParentContact {
  fullName: string;
  phoneNumber: string;
  email: string;
  relationship: string;
  _id: string;
}

export interface Student {
  _id: string;
  userId: User; // Nested user data
  classId: Class; // Nested class data
  gradeLevel: string;
  parentId: User; // Nested parent data
  parentContact: ParentContact; // Nested parent contact data
  isActive: boolean;
  gender: string;
  dateOfBirth: string;
}

export interface Teacher {
  _id: string;
  userId: User;
  assignedClasses: string[];
  assignedCourses: string[];
  isFormTeacher: boolean;
  highestAcademicQualification: string;
  yearsOfExperience: number;
  specialization: string;
  employmentType: string;
  employmentRole: string;
  availabilityDays: string[];
  availableTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  _id?: string;
  name: string;
  classId: string;
  termId: string;
  uploadDate: string;
  image: string;
  files: string[];
}

export interface StudentCardProps {
  student: Student;
}
