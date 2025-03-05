"use client"

import { ColumnDef } from "@tanstack/react-table"
import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"

type AttendanceStatus = "present" | "absent"

export type Attendance = {
  id: string
  name: string
  date: string
  examScore: number
  status: AttendanceStatus
  isAbsent?: boolean
  reasonForAbsence?: string
}

interface ColumnsProps {
  onCancel: (studentId: string) => void
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
}

export const columns = ({ onCancel, onStatusChange }: ColumnsProps): ColumnDef<Attendance>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "examScore",
    header: "Exam Score (70%)",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const student = row.original
      const isAbsent = student.status === "absent"
      const isPresent = student.status === "present"

      if (isAbsent) {
        return (
          <div className="text-red-500">Absent</div>
        )
      }

      return (
        <Button
          variant="ghost"
          className="text-green-500 hover:text-green-600"
          onClick={() => {
            onStatusChange(student.id, "present")
          }}
          disabled={student.reasonForAbsence !== undefined || isPresent}
        >
          {isPresent ? "Present" : "Mark Present"}
        </Button>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const student = row.original
      const isAbsent = student.status === "absent"

      if (student.reasonForAbsence || isAbsent) {
        return null
      }

      return (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onCancel(student.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )
    },
  },
]

