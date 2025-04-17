"use client";
import { Download } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { getTeacherTimetable } from "@/app/services/api.service";

// Define a TypeScript interface for a single timetable entry.
interface TimetableEntry {
  time: string;
  startTIme: string;
  endTime: string;
  course: string;
  subject: string;
  class: string;
}

const Timetable = () => {
  const hourHeight = 130; // Height for each hour (in pixels)
  const startHour = 8; // Start of the timetable (8 AM)
  const [manualTime, setManualTime] = useState("10:32");
  const [selectedClass, setSelectedClass] = useState("");
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const { user, classes, refreshClasses } = useAppContext(); // Use AppContext
  const { getAccessToken } = useAuth(); // Get logged-in teacher's info

  // State to store dynamic timetable entries (by day).
  const [timetableEntries, setTimetableEntries] = useState<
    Record<string, TimetableEntry[]>
  >({});

  // Calculate current time indicator position
  useEffect(() => {
    const [hours, minutes] = manualTime.split(":").map(Number);
    const timePosition = (hours - startHour + minutes / 60) * hourHeight + 65;
    setCurrentTimePosition(timePosition);
  }, [manualTime, hourHeight]);

  // Handler for select change (for filtering by class, if needed)
  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(event.target.value);
    // Optionally filter timetable entries by class here
  };

  // Fetch timetable data from the API for the current teacher
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user) return;

    const teacherId = user.userId;

    const fetchData = async () => {
      try {
        const data = await getTeacherTimetable(teacherId, token);
        console.log(data);
        setTimetableEntries(data);
      } catch (error) {
        console.error("Failed to load timetable:", error);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="sm:px-4 p-3 max-w-[95vw] overflow-hidden">
      <div className="mx-auto bg-[#F8F8F8] rounded-lg ">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <Button className="py-6 hidden sm:flex bg-[#003366] hover:bg-blue-800 text-white">
            Download
            <Download className="mr-2 h-7 w-6" />
          </Button>
        </div>
        <p className="text-[#AAAAAA] mb-6">
          Stay on Track with Your Class Schedule!
        </p>

        {/* Timetable Grid */}
        <div className="overflow-x-auto border border-[#F0F0F0] rounded-t-3xl h-screen 2xl:max-h-[full] overflow-y-scroll scrollbar-hide">
          {/* Header Row */}
          <div
            className="grid sticky top-0 z-30"
            style={{ gridTemplateColumns: "103px repeat(5, 1fr)" }}
          >
            <div className="font-semibold text-center bg-[#FFFFFF] py-6 border-b">
              Time
            </div>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day, index) => (
                <div
                  key={index}
                  className="font-semibold min-w-[114px] text-center bg-[#FFFFFF] py-6 border-l border-[#F0F0F0] border-b"
                >
                  {day}
                </div>
              )
            )}
          </div>

          {/* Body Grid */}
          <div
            className="grid relative"
            style={{ gridTemplateColumns: "103px repeat(5, 1fr)" }}
          >
            {/* Time labels */}
            <div className="bg-white">
              {["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM"].map(
                (time, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center border-b border-[#F0F0F0]"
                    style={{ height: `${hourHeight}px` }}
                  >
                    {time}
                  </div>
                )
              )}
            </div>

            {/* Render timetable entries for each day */}
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="col-span-1 border-l min-w-[114px] border-[#F0F0F0] bg-white relative"
                >
                  {(timetableEntries[day] || []).map(
                    (entry: TimetableEntry, entryIndex: number) => {
                      // Helper function to parse time from a string.
                      const parseTime = (timeStr: string): number => {
                        const [time, modifier] = timeStr.split(" ");
                        let [hours, minutes] = time.split(":").map(Number);
                        if (modifier === "PM" && hours !== 12) {
                          hours += 12;
                        }
                        if (modifier === "AM" && hours === 12) {
                          hours = 0;
                        }
                        return hours + minutes / 60;
                      };

                      const startHr = parseTime(entry.startTIme);
                      const endHr = parseTime(entry.endTime);
                      const topPosition =
                        (startHr - startHour) * hourHeight + 65;
                      const entryHeight = (endHr - startHr) * hourHeight - 16;

                      return (
                        <div
                          key={entryIndex}
                          className="absolute left-0 right-0 p-2 shadow-orange-800 border-y border-[#F0F0F0] flex items-center justify-center text-center"
                          style={{
                            top: `${topPosition}px`,
                            height: `${entryHeight}px`,
                          }}
                        >
                          <div>
                            <div className="font-semibold">{entry.course}</div>
                            <div className="font-semibold">{entry.subject}</div>
                            <div className="text-sm text-gray-500">
                              {entry.startTIme} - {entry.endTime}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )
            )}

            {/* Dynamic Time Indicator */}
            <div
              className="absolute left-[110px] w-[88%] 2xl:w-[93%]"
              style={{
                top: `${currentTimePosition - 7}px`,
                zIndex: 20,
              }}
            >
              <div className="absolute top-[-6px] left-[-87px] px-3 py-1 flex items-center justify-center bg-[#002B5B] text-white font-medium rounded-full">
                {manualTime}
              </div>
              <div
                className="absolute left-[-8px] right-0 h-2 w-2 rounded-full bg-[#002B5B]"
                style={{ top: "5.4px" }}
              />
              <div
                className="absolute top-2 left-0 right-0 bg-[#002B5B]"
                style={{ height: "3px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timetable;
