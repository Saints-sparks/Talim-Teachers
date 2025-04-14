"use client"

import { ColumnDef } from "@tanstack/react-table"
import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { AttendanceRecord } from "@/app/attendance/page"

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
  onDirectSubmit: (studentId: string) => void
}

export const columns = ({ onCancel, onStatusChange, onDirectSubmit }: ColumnsProps): ColumnDef<AttendanceRecord, unknown>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "date",
    header: "Date",
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
          <Button
            variant="ghost"
            className="text-red-500 border border-[#ECECEC]"
            onClick={() => {
              onStatusChange(student.id, "present")
            }}
          >
            Absent
          </Button>
        )
      }

      return (
        <Button
          variant="ghost"
          className="text-[#434343] border border-[#ECECEC] font-medium"
          onClick={() => {
            onStatusChange(student.id, "absent")
          }}
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

      return (
        <Button 
          variant="ghost" 
          className="rounded-full border border-[#ECECEC] "
          size="icon"
          onClick={() => {
            // If the student is absent, open the reason dialog.
            if (isAbsent) {
              onCancel(student.id)
            } else {
              // If present, proceed to submit the attendance to the API directly.
              onDirectSubmit(student.id)
            }
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )
    },
  },
]
