"use client";
import {
  Download,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { getTeacherTimetable } from "@/app/services/api.service";
import { toast } from "react-hot-toast";

// Define a TypeScript interface for a single timetable entry.
interface TimetableEntry {
  time: string;
  startTime?: string; // Optional because backend has typo "startTIme"
  startTIme?: string; // Handle backend typo
  endTime: string;
  course: string;
  subject: string;
  class: string;
}

// Define interface for timetable data grouped by days
interface TimetableData {
  [day: string]: TimetableEntry[];
}

// Error state interface
interface ErrorState {
  hasError: boolean;
  message: string;
  type: "network" | "server" | "empty" | "unknown";
}

// Days of the week
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Time slots (configurable) - using 12-hour format to match backend
const TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
];

const Timetable: React.FC = () => {
  const { user, getAccessToken } = useAuth();

  // State management
  const [timetableData, setTimetableData] = useState<TimetableData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>({
    hasError: false,
    message: "",
    type: "unknown",
  });
  const [retryCount, setRetryCount] = useState(0);

  // Filter states
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [timeRange, setTimeRange] = useState({
    start: 0,
    end: TIME_SLOTS.length - 1,
  });
  const [isMobileView, setIsMobileView] = useState(false);

  // Refs and indicator state for current-time line
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState<{
    top: number;
    left: number; // line left (after sticky column)
    width: number;
    stickyLeft: number; // left position of sticky column relative to wrapper
    badgeLeft: number; // computed left for the time badge
    timeLabel: string;
    visible: boolean;
  }>({ top: 0, left: 0, width: 0, stickyLeft: 0, badgeLeft: 0, timeLabel: "", visible: false });

  // Debug / preview: force the indicator to a specific time (useful for screenshots)
  // Set to '' to use real current time. Example: '10:30 AM'
  const PREVIEW_INDICATOR_TIME = "10:30 AM"; // empty string to disable

  // Fetch timetable data
  const fetchTimetable = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError({ hasError: false, message: "", type: "unknown" });

    try {
      if (!user?.userId) {
        throw new Error("User information not available");
      }

      const token = getAccessToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }

      const response = await getTeacherTimetable(user.userId, token);

      if (response) {
        // The API returns data grouped by days
        const timetableByDays = response || {};
        console.log("Received timetable data:", timetableByDays); // Debug log
        setTimetableData(timetableByDays);

        // Check if there are any scheduled classes
        const totalClasses = Object.values(timetableByDays).reduce(
          (total: number, dayEntries) =>
            total + (Array.isArray(dayEntries) ? dayEntries.length : 0),
          0
        );

        console.log("Total classes found:", totalClasses); // Debug log

        if (totalClasses === 0) {
          setError({
            hasError: true,
            message: "No classes scheduled for this week",
            type: "empty",
          });
        } else {
          toast.success(
            `Timetable loaded successfully! Found ${totalClasses} classes.`
          );
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Failed to fetch timetable:", err);

      let errorType: ErrorState["type"] = "unknown";
      let errorMessage = "Failed to load timetable. Please try again.";

      if (err.message?.includes("network") || err.code === "NETWORK_ERROR") {
        errorType = "network";
        errorMessage =
          "Network connection error. Please check your internet connection and try again.";
      } else if (err.message?.includes("404") || err.status === 404) {
        errorType = "empty";
        errorMessage = "No timetable found for your account.";
      } else if (err.status >= 500) {
        errorType = "server";
        errorMessage =
          "Server error occurred. Please try again later or contact support.";
      } else if (err.message?.includes("Authentication")) {
        errorType = "unknown";
        errorMessage = "Authentication error. Please log in again.";
      }

      setError({
        hasError: true,
        message: errorMessage,
        type: errorType,
      });

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry with exponential backoff
  const retryFetch = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);

    // Add delay for retry attempts
    const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000);
    setTimeout(() => fetchTimetable(), delay);
  };

  // Initial data fetch
  useEffect(() => {
    if (user?.userId) {
      fetchTimetable();
    }
  }, [user?.userId]);

  // Get timetable entry for specific day and time - improved matching
  const getTimetableEntry = (day: string, timeSlot: string) => {
    const dayEntries = timetableData[day] || [];

    // Debug logging
    if (day === "Tuesday" && dayEntries.length > 0) {
      console.log(`Looking for ${day} ${timeSlot}:`, {
        dayEntries,
        timeSlot,
        availableEntries: dayEntries.map((e) => ({
          time: e.time,
          startTime: e.startTime || e.startTIme,
          endTime: e.endTime,
        })),
      });
    }

    // First, try exact matches
    let entry = dayEntries.find((entry) => {
      const startTime = entry.startTime || entry.startTIme || "";
      const exactMatch =
        entry.time === timeSlot ||
        `${startTime} - ${entry.endTime}` === timeSlot;
      if (exactMatch && day === "Tuesday") {
        console.log("Found exact match:", entry);
      }
      return exactMatch;
    });

    if (entry) return entry;

    // If no exact match, try time-based matching
    const slotStart = timeSlot.split(" - ")[0]; // e.g., "08:00 AM"
    const slotStartHour = parseInt(slotStart.split(":")[0]); // e.g., 8
    const slotStartMinute = parseInt(slotStart.split(":")[1].split(" ")[0]); // e.g., 0

    entry = dayEntries.find((entry) => {
      const startTime = entry.startTime || entry.startTIme || "";
      if (!startTime) return false;

      const entryStartHour = parseInt(startTime.split(":")[0]);
      const entryStartMinute = parseInt(startTime.split(":")[1].split(" ")[0]);

      // Check if the entry starts within this time slot (within same hour)
      const match =
        entryStartHour === slotStartHour &&
        Math.abs(entryStartMinute - slotStartMinute) <= 30; // Allow 30-minute tolerance

      if (match && day === "Tuesday") {
        console.log("Found time-based match:", entry, {
          slotStart,
          startTime,
          hourMatch: entryStartHour === slotStartHour,
          minuteDiff: Math.abs(entryStartMinute - slotStartMinute),
        });
      }

      return match;
    });

    return entry;
  };

  // Get all entries for a day that don't match standard time slots
  const getUnmatchedEntries = (day: string) => {
    const dayEntries = timetableData[day] || [];
    return dayEntries.filter((entry) => {
      // Check if this entry matches any of our time slots
      return !filteredTimeSlots.some((timeSlot) => {
        const startTime = entry.startTime || entry.startTIme || "";
        const slotStart = timeSlot.split(" - ")[0];
        const slotStartHour = parseInt(slotStart.split(":")[0]);
        const entryStartHour = parseInt(startTime.split(":")[0]);

        return (
          entry.time === timeSlot ||
          `${startTime} - ${entry.endTime}` === timeSlot ||
          entryStartHour === slotStartHour
        );
      });
    });
  };

  // Calculate total scheduled classes
  const getTotalScheduledClasses = () => {
    return Object.values(timetableData).reduce(
      (total: number, dayEntries) =>
        total + (Array.isArray(dayEntries) ? dayEntries.length : 0),
      0
    );
  };

  // Filter time slots based on range
  const filteredTimeSlots = TIME_SLOTS.slice(
    timeRange.start,
    timeRange.end + 1
  );

  // --- Current time indicator helpers ---
  const parseTimeToMinutes = (t: string) => {
    if (!t) return NaN;
    const parts = t.split(" ");
    const time = parts[0];
    const ampm = parts[1] || "";
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const computeIndicator = () => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return setIndicator({ top: 0, left: 0, width: 0, stickyLeft: 0, badgeLeft: 0, timeLabel: "", visible: false });

    // Allow previewing the indicator at a forced time for screenshots/testing
    let nowMinutes: number;
    let formatted: string;
    if (PREVIEW_INDICATOR_TIME && PREVIEW_INDICATOR_TIME.trim().length > 0) {
      nowMinutes = parseTimeToMinutes(PREVIEW_INDICATOR_TIME);
      formatted = PREVIEW_INDICATOR_TIME;
    } else {
      const now = new Date();
      nowMinutes = now.getHours() * 60 + now.getMinutes();
      formatted = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const slotStarts = filteredTimeSlots.map((slot) => {
      const start = slot.split(" - ")[0].trim();
      return parseTimeToMinutes(start);
    });

    if (slotStarts.length === 0) {
      setIndicator({ top: 0, left: 0, width: 0, stickyLeft: 0, badgeLeft: 0, timeLabel: formatted, visible: false });
      return;
    }

    // Compute timeline minute range (first slot start .. last slot end)
    const firstSlotStart = slotStarts[0];
    const lastSlotStart = slotStarts[slotStarts.length - 1];
    const lastSlotEnd = (slotStarts[slotStarts.length - 1] ?? firstSlotStart) + 60;
    const totalMinutes = Math.max(1, lastSlotEnd - firstSlotStart);

    const rows = wrapper.querySelectorAll("tbody tr");
    // Measure total available pixels for the timeline (tbody height)
    const tbodyEl = wrapper.querySelector("tbody") as HTMLElement | null;
    const tbodyRect = tbodyEl ? tbodyEl.getBoundingClientRect() : null;
    const wrapperRect = wrapper.getBoundingClientRect();

    let timelineTop = 0;
    let timelineHeight = 0;
    if (tbodyRect) {
      timelineTop = tbodyRect.top;
      timelineHeight = tbodyRect.height;
    } else if (rows.length > 0) {
      // Fallback: sum row heights
      let h = 0;
      rows.forEach((r) => {
        const rr = (r as HTMLElement).getBoundingClientRect();
        if (h === 0) timelineTop = rr.top;
        h += rr.height;
      });
      timelineHeight = h;
    } else {
      setIndicator({ top: 0, left: 0, width: 0, stickyLeft: 0, badgeLeft: 0, timeLabel: formatted, visible: false });
      return;
    }

    const pxPerMinute = timelineHeight / totalMinutes;

    // Compute minutes since timeline start
    let minutesSinceStart = nowMinutes - firstSlotStart;

    // Find the slot index and slot start/end for snapping logic
    let idx = slotStarts.findIndex((start, i) => {
      const next = slotStarts[i + 1] ?? start + 60;
      return nowMinutes >= start && nowMinutes < next;
    });

    const SNAP_TO_SLOT_END = true; // optionally snap to end of slot for preview
    if (SNAP_TO_SLOT_END && idx !== -1) {
      const slotStart = slotStarts[idx];
      const slotEnd = slotStarts[idx + 1] ?? slotStart + 60;
      // Snap preview times to the end of the slot
      if (PREVIEW_INDICATOR_TIME && PREVIEW_INDICATOR_TIME.trim().length > 0) {
        minutesSinceStart = slotEnd - firstSlotStart;
      }
    }

    // If outside the timeline range, hide indicator
    if (minutesSinceStart < 0 || minutesSinceStart > totalMinutes) {
      setIndicator({ top: 0, left: 0, width: 0, stickyLeft: 0, badgeLeft: 0, timeLabel: formatted, visible: false });
      return;
    }

    const top = timelineTop - wrapperRect.top + minutesSinceStart * pxPerMinute;

    const tableEl = wrapper.querySelector("table") as HTMLElement | null;
    const stickyCell = wrapper.querySelector("td.sticky") as HTMLElement | null;
    const stickyRect = stickyCell ? stickyCell.getBoundingClientRect() : null;
    const stickyWidth = stickyRect ? stickyRect.width : 103;
    const stickyLeft = stickyRect ? stickyRect.left - wrapperRect.left : 0;
    // Start the line at the right edge of the sticky cell
    const left = stickyLeft + stickyWidth;
    // Compute available width for the line inside the wrapper (leave small right margin)
    const width = Math.max(0, wrapperRect.width - left - 16);

    // Measure badge width (if rendered) so we can center it on the indicator
    const badgeEl = wrapper.querySelector(".current-time-badge") as HTMLElement | null;
    const badgeWidth = badgeEl ? badgeEl.offsetWidth : 0;
    // Center the badge horizontally on the indicator (left) and clamp inside wrapper
    // BADGE_NUDGE lets us nudge the badge horizontally (negative = move right, positive = move left)
    const minLeftClamp = 8;
    const maxLeftClamp = Math.max(minLeftClamp, wrapperRect.width - badgeWidth - 8);
    const BADGE_NUDGE = -85; // px: negative moves left, positive moves right
    const badgeLeft = Math.min(
      maxLeftClamp,
      Math.max(minLeftClamp, left - badgeWidth / 2 + BADGE_NUDGE)
    );

    setIndicator({ top, left, width, stickyLeft, badgeLeft, timeLabel: formatted, visible: true });
  };

  useEffect(() => {
    computeIndicator();
    const iv = setInterval(computeIndicator, 30 * 1000);
    const onResize = () => computeIndicator();
    window.addEventListener("resize", onResize);
    tableWrapperRef.current?.addEventListener("scroll", computeIndicator, { passive: true });
    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", onResize);
      tableWrapperRef.current?.removeEventListener("scroll", computeIndicator);
    };
  }, [filteredTimeSlots, timetableData]);

  // Export timetable to CSV
  const exportTimetable = () => {
    try {
      const totalClasses = getTotalScheduledClasses();
      if (totalClasses === 0) {
        toast.error("No timetable data to export");
        return;
      }

      // Create CSV content
      let csvContent = "Day,Time Slot,Course,Subject,Class\n";

      selectedDays.forEach((day) => {
        filteredTimeSlots.forEach((timeSlot) => {
          const entry = getTimetableEntry(day, timeSlot);
          if (entry) {
            csvContent += `${day},"${timeSlot}","${entry.course}","${entry.subject}","${entry.class}"\n`;
          } else {
            csvContent += `${day},"${timeSlot}","Free Period","",""\n`;
          }
        });
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `timetable_${new Date().toISOString().split("T")[0]}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Timetable exported successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export timetable");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Header with filters and controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 md:p-6 bg- rounded-xl  shadow-none">
        <div className="flex items-center gap-3 md:gap-4">
          {/* <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#003366] to-[#004080] rounded-xl flex items-center justify-center shadow-none">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div> */}
          <div>
            <h2 className="text-lg md:text-xl font-medium text-[#2F2F2F] mb-1">
              Timetable
            </h2>
            <p className="md:text-lg text-[#6F6F6F] flex items-center gap-2 text-sm">
              Your class schedule for the week
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Day filter */}
          {/* <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#2F2F2F]">Days:</label>
            <select
              value={selectedDays.length === DAYS.length ? "all" : "custom"}
              onChange={(e) => {
                if (e.target.value === "all") {
                  setSelectedDays(DAYS);
                }
              }}
              className="px-3 py-2 border border-[#F0F0F0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] transition-all"
            >
              <option value="all">All Days</option>
              <option value="custom">Custom</option>
            </select>
          </div> */}

          {/* Time range filter */}
          {/* <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#2F2F2F]">Time:</label>
            <select
              value={`${timeRange.start}-${timeRange.end}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split("-").map(Number);
                setTimeRange({ start, end });
              }}
              className="px-3 py-2 border border-[#F0F0F0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] transition-all"
            >
              <option value="0-8">Full Day (8:00 - 17:00)</option>
              <option value="0-4">Morning (8:00 - 13:00)</option>
              <option value="4-8">Afternoon (13:00 - 17:00)</option>
            </select>
          </div> */}

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Mobile view toggle - only show on small screens */}
            {/* <Button
              onClick={() => setIsMobileView(!isMobileView)}
              variant="outline"
              size="sm"
              className="flex md:hidden items-center gap-2 border-[#F0F0F0] text-purple-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all duration-200 shadow-none"
            >
              <ChevronLeft
                className={`w-4 h-4 transition-transform ${isMobileView ? "rotate-180" : ""
                  }`}
              />
              <span>{isMobileView ? "Card View" : "Table View"}</span>
            </Button> */}

            {/* <Button
              onClick={() => fetchTimetable(false)}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2 border-[#F0F0F0] text-[#6F6F6F] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 shadow-none"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isLoading ? "Refreshing..." : "Refresh"}
              </span>
            </Button> */}

            <Button
              disabled={isLoading || error.hasError}
              className="flex items-center gap-2 text-[#6F6F6F] border-none shadow-none"
            >
              <span className="hidden sm:inline">See All</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {isLoading ? (
        // Loading State
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-gradient-to-br from-white to-blue-50 rounded-xl border border-[#F0F0F0] shadow-none">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-[#003366] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-medium text-[#030E18] mb-2">
              Loading Your Timetable
            </h3>
            <p className="text-[#6F6F6F] max-w-md">
              Please wait while we fetch your class schedule for this week...
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#003366] rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-[#003366] rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-[#003366] rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      ) : error.hasError ? (
        // Error States
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 shadow-none">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-6 shadow-none">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-medium text-red-700 mb-3">
              {error.type === "network"
                ? "🌐 Connection Error"
                : error.type === "server"
                  ? "⚠️ Server Error"
                  : error.type === "empty"
                    ? "📚 No Schedule Found"
                    : "❌ Something went wrong"}
            </h3>

            <p className="text-red-600 max-w-md leading-relaxed">
              {error.message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={retryFetch}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-none hover:shadow-none transition-all duration-200 flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </>
              )}
            </Button>

            {error.type === "network" && (
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-red-300 text-red-600 hover:bg-red-50 transition-all duration-200 shadow-none"
              >
                Reload Page
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Timetable Grid
        <div className=" rounded-3xl border border-[#F0F0F0] overflow-hidden shadow-2xl transition-all duration-300">
          {/* Mobile Card View */}
          {isMobileView ? (
            <div className="p-4 space-y-4">
              {selectedDays.map((day) => {
                const allDayEntries = timetableData[day] || [];
                const dayEntries = filteredTimeSlots
                  .map((timeSlot) => ({
                    timeSlot,
                    entry: getTimetableEntry(day, timeSlot),
                  }))
                  .filter((item) => item.entry); // Only show slots with classes

                return (
                  <div
                    key={day}
                    className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-[#003366]">
                        {day}
                      </h3>
                      <div className="flex-1 h-px bg-[#003366]/20"></div>
                      <span className="text-sm text-[#6F6F6F]">
                        {allDayEntries.length} classes
                      </span>
                    </div>

                    {allDayEntries.length === 0 ? (
                      <div className="text-center py-8 text-[#878787]">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-[#F0F0F0]" />
                        <p>No classes scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Show all entries for this day */}
                        {allDayEntries.map((entry, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#003366]" />
                                <div>
                                  <h4 className="font-semibold text-[#030E18]">
                                    {entry.course}
                                  </h4>
                                  <p className="text-sm text-[#6F6F6F]">
                                    {entry.subject}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-[#003366]">
                                  {entry.time}
                                </div>
                                <div className="text-xs text-[#878787]">
                                  {entry.startTime || entry.startTIme} -{" "}
                                  {entry.endTime}
                                </div>
                              </div>
                            </div>

                            {entry.class && (
                              <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                                <Users className="w-4 h-4" />
                                <span>{entry.class}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop Table View */
            <div ref={tableWrapperRef} className="relative overflow-x-auto">
              <table className="w-full min-w-[900px] bg-[#F8F8F8]">
                <thead>
                  <tr className="bg-[#F8F8F8] border-b border-[#F0F0F0]">
                    <th className="bg-white px-4 py-4 text-left font-semibold text-[#030E18] min-w-[140px] border-r border-[#F0F0F0]">
                      <div className="text-lg flex items-center justify-center">
                        Time
                      </div>
                    </th>
                    {selectedDays.map((day) => (
                      <th
                        key={day}
                        className="bg-white px-4 py-4 text-center font-semibold text-[#030E18] border-r border-[#F0F0F0]"
                      >
                        <div className=" flex flex-col items-center gap-1">
                          <span className="text-lg">{day}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {filteredTimeSlots.map((timeSlot, index) => (
                    <tr
                      key={timeSlot}
                      className={`border-b border-[#F0F0F0] h-[100px]`}
                    >
                      <td className="px-4 py-6 font-semibold text-[#030E18] border-r border-[#F0F0F0] bg-[#F8F8F8] sticky left-0 z-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div className="text-sm font-bold text-[#2E2E2E]">
                            {timeSlot}
                          </div>
                          <div className="w-16 h-px bg-[#F8F8F8]"></div>
                          {/* <div className="text-xs text-[#878787]">
                            Slot {index + 1}
                          </div> */}
                        </div>
                      </td>
                      {selectedDays.map((day) => {
                        const entry = getTimetableEntry(day, timeSlot);
                        return (
                          <td
                            key={`${day}-${timeSlot}`}
                            className="px-2 md:px-4 py-4 md:py-6 border-r border-[#F0F0F0]"
                          >
                            {entry ? (
                              <div className="bg-white text-[#030E18] rounded-2xl border border-[#F0F0F0] shadow-sm w-[160px] h-[90px] p-3 flex flex-col items-center justify-center mx-auto hover:shadow-md transition-shadow duration-200">
                                {/* <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-2 flex-1">
                                    <BookOpen className="w-3 h-3 text-blue-200 flex-shrink-0" />
                                    <div className="font-semibold text-xs">
                                      {entry.course}
                                    </div>
                                  </div>
                                  <Clock className="w-3 h-3 text-blue-200 flex-shrink-0" />
                                </div> */}

                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <div className="text-lg text-[#030E18] font-medium">
                                    {entry.subject}
                                  </div>
                                </div>

                                {/* <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3 text-blue-200" />
                                  <div className="text-xs text-blue-200">
                                    {entry.class}
                                  </div>
                                </div> */}

                                <div className="mt-2 pt-2">
                                  <div className="text-xs text-[#646464] flex items-center justify-center gap-1">
                                    <span>{entry.startTime || entry.startTIme} - {entry.endTime}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              null
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Current time indicator overlay */}
              {indicator.visible && (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  {/* badge inside sticky column */}
                  <div
                    style={{
                      position: "absolute",
                      left: indicator.badgeLeft,
                      top: indicator.top,
                      transform: "translateY(-50%)",
                      zIndex: 60,
                    }}
                  >
                    <div className="current-time-badge bg-[#08335f] text-white rounded-full px-3 py-1 text-xs font-medium shadow">
                      {indicator.timeLabel}
                    </div>
                  </div>

                  {/* dot and horizontal line centered on indicator */}
                  {/* Use small constants to make micro-adjustments easy */}
                  {(() => {
                    const dotSize = 12; // px
                    const lineHeight = 2; // px
                    const dotLeft = indicator.left - dotSize / 2;
                    const dotTop = indicator.top - dotSize / 2;
                    const lineLeft = indicator.left + dotSize / 2; // start at dot's right edge
                    const lineTop = indicator.top - lineHeight / 2;
                    return (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            left: dotLeft,
                            top: dotTop,
                            width: dotSize,
                            height: dotSize,
                            borderRadius: 9999,
                            background: "#08335f",
                            zIndex: 60,
                          }}
                        />

                        <div
                          style={{
                            position: "absolute",
                            left: lineLeft,
                            top: lineTop,
                            width: Math.max(0, indicator.width - dotSize / 2),
                            height: lineHeight,
                            background: "#08335f",
                            opacity: 1,
                            zIndex: 50,
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Summary footer */}
          <div className="bg-gradient-to-r from-[#F0F0F0]/50 to-[#F0F0F0]/30 px-6 py-4 border-t-2 border-[#F0F0F0]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 text-[#030E18]">
                <div className="w-10 h-10 bg-[#003366] rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg text-[#003366]">
                    {getTotalScheduledClasses()}
                  </div>
                  <div className="text-sm text-[#6F6F6F]">
                    classes scheduled this week
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white rounded shadow-none"></div>
                  <span className="text-sm font-medium text-[#030E18]">
                    Scheduled Class
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-[#F0F0F0] to-[#F0F0F0]/70 rounded border border-[#F0F0F0]"></div>
                  <span className="text-sm font-medium text-[#030E18]">
                    Free Period
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
