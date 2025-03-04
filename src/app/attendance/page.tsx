"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";
import Timetable from "@/components/Timetable";
import { DataTable } from "@/components/attendance/data-table";
import { AbsentReasonDialog } from "@/components/attendance/absent-reason-dialog";
import { columns } from "@/components/attendance/columns";

type AttendanceStatus = "present" | "absent";

interface AttendanceRecord {
  id: string;
  name: string;
  date: string;
  examScore: number;
  status: AttendanceStatus;
  isAbsent?: boolean;
  reasonForAbsence?: string;
}

const initialData: AttendanceRecord[] = [
    {
      id: "1",
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 56,
      status: "present"
    },
    {
      id: "2",
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 61,
      status: "present"
    },
    {
      id: "3",
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 54,
      status: "present"
    },
    {
      id: "4",
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 65,
      status: "present"
    },
    {
      id: "5",
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 62,
      status: "present"
    },
    {
      id: "6", 
      name: "Adebayo Funmilayo",
      date: "12th Dec 2024",
      examScore: 59,
      status: "present"
    },
    {
      id: "7",
      name: "Adebayo Funmilayo", 
      date: "12th Dec 2024",
      examScore: 357,
      status: "present"
    }
  ]

const AttendancePage: React.FC = () => {
  const [data, setData] = useState<AttendanceRecord[]>(initialData);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setData((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          return {
            ...student,
            status,
            isAbsent: status === "absent",
          };
        }
        return student;
      })
    );
  };

  const handleAbsentSubmit = (reason: string) => {
    if (selectedStudent) {
      setData(prev => prev.map(student => {
        if (student.id === selectedStudent) {
          return {
            ...student,
            status: "absent",
            isAbsent: true,
            reasonForAbsence: reason
          }
        }
        return student
      }))
      setOpen(false)
      setSelectedStudent(null)
    }
  }

  return (
    <div className=" space-y-1 bg-[F8F8F8] text-black">
      <Header />

      <div className="h-full flex-1 flex-col space-y-8 p-8 flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
            <p className="text-muted-foreground">
              Grade and upload student results effortlessly.
            </p>
          </div>


          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search for students"
                  className="w-full pl-8 pr-2 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
      
          <DataTable
            columns={columns({
              onCancel: (studentId) => {
                setSelectedStudent(studentId);
                setOpen(true);
              },
              onStatusChange: handleStatusChange,
            })}
            data={data}
          />
          <AbsentReasonDialog
            open={open}
            onOpenChange={setOpen}
            studentId={selectedStudent}
            onSubmit={handleAbsentSubmit}
          />
        </div>
      </div>

      <RowNumber />
    </div>
  );
};
export default AttendancePage;
