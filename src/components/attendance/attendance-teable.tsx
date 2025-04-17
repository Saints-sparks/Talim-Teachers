"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "../ui/badge";

const attendanceData = [
  {
    date: "31st December, 2024",
    day: "Monday",
    status: "present",
    remarks: "-",
  },
  {
    date: "31st December, 2024",
    day: "Tuesday",
    status: "present",
    remarks: "Sick leave submitted",
  },
  {
    date: "31st December, 2024",
    day: "Tuesday",
    status: "absent",
    remarks: "-",
  },
  {
    date: "31st December, 2024",
    day: "Tuesday",
    status: "absent",
    remarks: "No explanation",
  },
  {
    date: "31st December, 2024",
    day: "Tuesday",
    status: "present",
    remarks: "No explanation",
  },
  {
    date: "31st December, 2024",
    day: "Tuesday",
    status: "absent",
    remarks: "No explanation",
  },
];

export function AttendanceTable() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks/Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceData.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{record.date}</TableCell>
              <TableCell>{record.day}</TableCell>
              <TableCell>
                <Badge
                  text={record.status === "present" ? "Present" : "Absent"}
                  variant="secondary"
                  className={`${
                    record.status === "present"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {record.status === "present" ? "Present" : "Absent"}
                </Badge>
              </TableCell>
              <TableCell>{record.remarks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
