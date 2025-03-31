"use client";
import { Header } from "@/components/HeaderTwo";
import Layout from "@/components/Layout";
import { MetricCard } from "@/components/metric-card";

import { ScheduleTimeline } from "@/components/schedule-timeline";
import Timetable from "@/components/Timetable";

import React from "react";

const schedule = [
  { subject: "Mathematics", startTime: "08:00", endTime: "10:00" },
  { subject: "Civic Education", startTime: "10:00", endTime: "11:00" },
  { subject: "C.R.S", startTime: "11:00", endTime: "12:00" },
  { subject: "BREAK - TIME", startTime: "12:00", endTime: "01:00" },
  { subject: "English language", startTime: "01:00", endTime: "02:00" },
];

const metrics = {
  assignedSubjects: 15,
  addedResources: 23,
  recordedAttendance: 95,
};

const DashboardPage: React.FC = () => {
  return (
    <Layout>
      <div>
        <div className="p-6 space-y-1">
          <div className="flex-grow ">
            <h2 className="text-xl font-medium mb-4 text-[#2F2F2F]">Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/subject.svg"
                    width={52}
                    height={52}
                    alt="Subjects Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={metrics.assignedSubjects}
                label="Assigned Subjects"
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/award.svg"
                    alt="Award Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={metrics.addedResources}
                label="Added Resources"
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/calendar.svg"
                    alt="Award Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={metrics.recordedAttendance}
                label="Recorded Attendance"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <Timetable  />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
