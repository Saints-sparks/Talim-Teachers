"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  BarChart3,
  Users,
  Calendar,
  ClipboardCheck,
  TrendingUp,
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
          <div className="mx-auto w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-[#030E18]">
            Attendance for {className}
          </DialogTitle>
          <DialogDescription className="text-[#6F6F6F] mt-2">
            Choose an action to manage attendance for this class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4 ">
          {/* Mark Attendance Button */}
          <Button
            onClick={onMarkAttendance}
            className="w-full h-16 bg-[#003366] hover:bg-[#002244] text-white justify-start font-medium rounded-xl shadow-none transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-medium">Mark Attendance</div>
                <div className="text-sm opacity-90">
                  Record today's attendance
                </div>
              </div>
            </div>
          </Button>

          {/* View Attendance Analytics Button */}
          <Button
            onClick={onViewAttendance}
            variant="outline"
            className="w-full h-16 border-2 border-[#F0F0F0] hover:border-[#003366] hover:bg-[#F0F0F0] justify-start font-medium rounded-xl transition-colors duration-200 shadow-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left text-[#030E18]">
                <div className="font-semibold">View Attendance</div>
                <div className="text-sm text-[#6F6F6F]">
                  See attendance records & analytics
                </div>
              </div>
            </div>
          </Button>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-center gap-6 pt-6 border-t border-[#F0F0F0]">
          <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
            <Calendar className="w-4 h-4" />
            <span>Today: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
            <ClipboardCheck className="w-4 h-4" />
            <span>Quick & Easy</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceActionModal;
