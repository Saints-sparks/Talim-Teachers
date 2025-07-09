"use client";
import { Download, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { getTeacherTimetable } from "@/app/services/api.service";

// Define a TypeScript interface for a single timetable entry.
interface TimetableEntry {
  id?: string;
  time: string;
  startTime: string;
  endTime: string;
  course: string;
  subject: string;
  class: string;
  day: string;
}

// Error state interface
interface ErrorState {
  hasError: boolean;
  message: string;
  type: 'network' | 'server' | 'empty' | 'unknown';
}

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Time slots (configurable)
const TIME_SLOTS = [
  '08:00 - 09:00',
  '09:00 - 10:00', 
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00'
];

const Timetable: React.FC = () => {
  const { user } = useAuth();
  const { selectedSchool } = useAppContext();
  
  // State management
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>({
    hasError: false,
    message: '',
    type: 'unknown'
  });
  const [retryCount, setRetryCount] = useState(0);
  
  // Filter states
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [timeRange, setTimeRange] = useState({ start: 0, end: TIME_SLOTS.length - 1 });

  // Fetch timetable data
  const fetchTimetable = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError({ hasError: false, message: '', type: 'unknown' });

    try {
      if (!user?.id || !selectedSchool?.id) {
        throw new Error('User or school information not available');
      }

      const response = await getTeacherTimetable(user.id, selectedSchool.id);
      
      if (response && response.data) {
        const entries = Array.isArray(response.data) ? response.data : [];
        setTimetableData(entries);
        
        if (entries.length === 0) {
          setError({
            hasError: true,
            message: 'No classes scheduled for this week',
            type: 'empty'
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Failed to fetch timetable:', err);
      
      let errorType: ErrorState['type'] = 'unknown';
      let errorMessage = 'Failed to load timetable. Please try again.';
      
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('network')) {
        errorType = 'network';
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (err.response?.status >= 500) {
        errorType = 'server';
        errorMessage = 'Server error occurred. Please try again later or contact support.';
      } else if (err.response?.status === 404) {
        errorType = 'empty';
        errorMessage = 'No timetable found for your account.';
      }
      
      setError({
        hasError: true,
        message: errorMessage,
        type: errorType
      });
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
    if (user?.id && selectedSchool?.id) {
      fetchTimetable();
    }
  }, [user?.id, selectedSchool?.id]);

  // Get timetable entry for specific day and time
  const getTimetableEntry = (day: string, timeSlot: string) => {
    return timetableData.find(entry => 
      entry.day === day && 
      (entry.time === timeSlot || 
       `${entry.startTime} - ${entry.endTime}` === timeSlot)
    );
  };

  // Filter time slots based on range
  const filteredTimeSlots = TIME_SLOTS.slice(timeRange.start, timeRange.end + 1);

  // Export timetable to PDF/CSV (placeholder)
  const exportTimetable = () => {
    // Implementation for export functionality
    console.log('Exporting timetable...');
  };

  return (
    <div className="space-y-6">
      {/* Header with filters and controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 bg-white rounded-lg border border-[#F0F0F0]">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Weekly Timetable</h2>
          <p className="text-gray-600">Your class schedule for the week</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Day filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Days:</label>
            <select
              value={selectedDays.length === DAYS.length ? 'all' : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedDays(DAYS);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
            >
              <option value="all">All Days</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Time range filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time:</label>
            <select
              value={`${timeRange.start}-${timeRange.end}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split('-').map(Number);
                setTimeRange({ start, end });
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
            >
              <option value="0-8">Full Day (8:00 - 17:00)</option>
              <option value="0-4">Morning (8:00 - 13:00)</option>
              <option value="4-8">Afternoon (13:00 - 17:00)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => fetchTimetable(false)}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              onClick={exportTimetable}
              variant="outline"
              size="sm"
              disabled={isLoading || error.hasError}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {isLoading ? (
        // Loading State
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-lg border border-[#F0F0F0]">
          <div className="w-16 h-16 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Timetable</h3>
          <p className="text-gray-500 text-center">
            Please wait while we fetch your class schedule...
          </p>
        </div>
      ) : error.hasError ? (
        // Error States
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-lg border-2 border-red-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-red-700 mb-2">
            {error.type === 'network' ? 'Connection Error' : 
             error.type === 'server' ? 'Server Error' : 
             error.type === 'empty' ? 'No Schedule Found' : 'Something went wrong'}
          </h3>
          
          <p className="text-red-600 text-center max-w-md mb-6">
            {error.message}
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={retryFetch}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Try Again'}
            </Button>
            
            {error.type === 'network' && (
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Timetable Grid
        <div className="bg-white rounded-lg border border-[#F0F0F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 min-w-[120px]">
                    Time
                  </th>
                  {selectedDays.map(day => (
                    <th key={day} className="px-4 py-3 text-left font-medium text-gray-600">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTimeSlots.map((timeSlot, index) => (
                  <tr key={timeSlot} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-6 font-medium text-gray-700 border-r border-gray-200">
                      {timeSlot}
                    </td>
                    {selectedDays.map(day => {
                      const entry = getTimetableEntry(day, timeSlot);
                      return (
                        <td key={`${day}-${timeSlot}`} className="px-4 py-6 border-r border-gray-200">
                          {entry ? (
                            <div className="bg-[#003366] text-white rounded-lg p-3 hover:bg-[#002244] transition-colors cursor-pointer">
                              <div className="font-semibold text-sm mb-1">{entry.course}</div>
                              <div className="text-xs opacity-90">{entry.subject}</div>
                              <div className="text-xs opacity-75 mt-1">{entry.class}</div>
                            </div>
                          ) : (
                            <div className="h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Free</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">{timetableData.length}</span> classes scheduled this week
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#003366] rounded"></div>
                  <span>Scheduled Class</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded"></div>
                  <span>Free Period</span>
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
