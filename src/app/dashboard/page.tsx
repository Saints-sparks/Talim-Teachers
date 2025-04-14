"use client";
import Layout from "@/components/Layout";
import { MetricCard } from "@/components/metric-card";
import Timetable from "@/components/Timetable";

import React from "react";


const metrics = {
  assignedSubjects: {value: 15, link: "/subjects"},
  addedResources: {value: 23, link: "/resources"},
  recordedAttendance: {value: 95, link: "/attendance"},
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
                value={metrics.assignedSubjects.value}
                label="Assigned Subjects"
                link={metrics.assignedSubjects.link}
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/award.svg"
                    alt="Award Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={metrics.addedResources.value}
                label="Added Resources"
                link={metrics.addedResources.link}
              />
              <MetricCard
                icon={
                  <img
                    src="/icons/dashboard/calendar.svg"
                    alt="Award Icon"
                    className="h-[52px] w-[52px]"
                  />
                }
                value={metrics.recordedAttendance.value}
                label="Recorded Attendance"
                link={metrics.recordedAttendance.link}
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
