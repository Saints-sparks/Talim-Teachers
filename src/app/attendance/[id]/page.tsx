"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AttendanceStats } from "@/components/attendance/attendance-stats";
import { AttendanceTable } from "@/components/attendance/attendance-teable";
import Layout from "@/components/Layout";

export default function StudentAttendancePage() {
  return (
    <Layout>
      <div className="flex h-full flex-col space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <AttendanceStats
              title="Present Days"
              value={105}
              change={{
                type: "increase",
                value: 2,
                text: "Improved by 2 days this month",
              }}
            />
            <AttendanceStats
              title="Absent Days"
              value={12}
              change={{
                type: "decrease",
                value: 2,
                text: "Reduced by 2 days this month",
              }}
            />
            <AttendanceStats
              title="Attendance Percentage"
              value="95%"
              change={{
                type: "increase",
                value: 1.39,
                text: "1.39% increase this",
              }}
            />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium">Attendance Table</h3>
                <p className="text-sm text-muted-foreground">
                  Attendance Records at a Glance
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Attendance by Date" className="pl-8" />
              </div>
            </div>
            <AttendanceTable />
          </div>
        </div>
      </div>
    </Layout>
  );
}
