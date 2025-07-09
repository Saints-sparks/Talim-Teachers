"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckSquare, 
  BarChart3, 
  Users, 
  Calendar,
  ClipboardCheck,
  TrendingUp
} from "lucide-react";

interface AttendanceActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  onMarkAttendance: () => void;
  onViewAttendance: () => void;
}

export const AttendanceActionModal: React.FC<AttendanceActionModalProps> = ({
  open,
  onOpenChange,
  className,
  onMarkAttendance,
  onViewAttendance,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Attendance for {className}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Choose an action to manage attendance for this class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Mark Attendance Button */}
          <Button
            onClick={onMarkAttendance}
            className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Mark Attendance</div>
                <div className="text-sm opacity-90">Record today's attendance</div>
              </div>
            </div>
          </Button>

          {/* View Attendance Analytics Button */}
          <Button
            onClick={onViewAttendance}
            variant="outline"
            className="w-full h-16 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left text-gray-700">
                <div className="font-semibold">View Attendance</div>
                <div className="text-sm opacity-75">See attendance records & analytics</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-center gap-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Today: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardCheck className="w-4 h-4" />
            <span>Quick & Easy</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceActionModal;
