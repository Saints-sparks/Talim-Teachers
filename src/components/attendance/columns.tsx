"use client";

import { ColumnDef } from "@tanstack/react-table";
import { X, Check, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceRecord } from "@/app/attendance/page";

type AttendanceStatus = "present" | "absent";

export type Attendance = {
  id: string;
  name: string;
  date: string;
  examScore: number;
  status: AttendanceStatus;
  isAbsent?: boolean;
  reasonForAbsence?: string;
  isSubmitted?: boolean;
};

interface ColumnsProps {
  onCancel: (studentId: string) => void;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onDirectSubmit: (studentId: string) => void;
  submittedStudents?: Set<string>;
}

export const columns = ({
  onCancel,
  onStatusChange,
  onDirectSubmit,
  submittedStudents = new Set(),
}: ColumnsProps): ColumnDef<AttendanceRecord, unknown>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const student = row.original;
      const isSubmitted = student.isSubmitted || submittedStudents.has(student.id);
      
      return (
        <div className="flex items-center space-x-2">
          <span className="font-medium">{student.name}</span>
          {isSubmitted && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const student = row.original;
      const isAbsent = student.status === "absent";
      const isPresent = student.status === "present";
      const isSubmitted = student.isSubmitted || submittedStudents.has(student.id);

      if (isSubmitted) {
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isAbsent 
                ? "bg-red-100 text-red-700" 
                : "bg-green-100 text-green-700"
            }`}>
              {isAbsent ? "Absent" : "Present"}
            </span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        );
      }

      if (isAbsent) {
        return (
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              onStatusChange(student.id, "present");
            }}
          >
            Absent
          </Button>
        );
      }

      return (
        <Button
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50"
          onClick={() => {
            onStatusChange(student.id, "absent");
          }}
        >
          Present
        </Button>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const student = row.original;
      const isAbsent = student.status === "absent";
      const isSubmitted = student.isSubmitted || submittedStudents.has(student.id);

      if (isSubmitted) {
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Submitted</span>
          </div>
        );
      }

      return (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            // If the student is absent, open the reason dialog.
            if (isAbsent) {
              onCancel(student.id);
            } else {
              // If present, proceed to submit the attendance to the API directly.
              onDirectSubmit(student.id);
            }
          }}
        >
          <Send className="h-4 w-4 mr-1" />
          Submit
        </Button>
      );
    },
  },
];
