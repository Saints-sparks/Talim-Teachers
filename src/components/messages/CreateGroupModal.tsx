"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  BookOpen, 
  ArrowLeft, 
  Users,
  Search,
  Loader2
} from "lucide-react";
import Image from "next/image";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import { getCurrentTerm } from "@/app/services/api.service";
import { createGroupChat, CreateGroupChatPayload } from "@/app/services/chat.service";

// Utility function to get course icon based on course name
const getCourseIcon = (courseName: string) => {
  const name = courseName?.toLowerCase() || '';
  if (name.includes('math')) return '📊';
  if (name.includes('english') || name.includes('eng')) return '📚';
  if (name.includes('physics')) return '⚛️';
  if (name.includes('chemistry')) return '🧪';
  if (name.includes('biology')) return '🧬';
  if (name.includes('history')) return '📜';
  if (name.includes('geography')) return '🌍';
  if (name.includes('civic')) return '🏛️';
  if (name.includes('computer')) return '💻';
  if (name.includes('science')) return '🔬';
  if (name.includes('art')) return '🎨';
  if (name.includes('music')) return '🎵';
  if (name.includes('physical')) return '⚽';
  if (name.includes('lang')) return '🗣️';
  return '📖'; // default book icon
};

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "selection" | "class-list" | "course-list";

export default function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("selection");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [isLoadingTerm, setIsLoadingTerm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  
  const { classes, courses, isLoading, user, refreshChatRooms } = useAppContext() as any;
  const { getAccessToken } = useAuth();

  // Fetch current term when modal opens
  useEffect(() => {
    const fetchCurrentTerm = async () => {
      if (open && !currentTerm) {
        setIsLoadingTerm(true);
        try {
          const token = getAccessToken();
          if (!token) throw new Error("No auth token");

          const term = await getCurrentTerm(token);
          setCurrentTerm(term);
        } catch (error) {
          console.error("Error fetching current term:", error);
        } finally {
          setIsLoadingTerm(false);
        }
      }
    };

    fetchCurrentTerm();
  }, [open, currentTerm, getAccessToken]);

  const handleBack = () => {
    if (currentStep === "class-list" || currentStep === "course-list") {
      setCurrentStep("selection");
    }
  };

  const handleCreateGroup = async (item: any, type: "class" | "course") => {
    setIsCreating(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      if (!user) {
        throw new Error("User not found");
      }

      // Prepare the payload based on the DTO structure
      const payload: CreateGroupChatPayload = {
        type: type === "class" ? "class_group" : "course_group",
        termId: currentTerm?._id || currentTerm?.id,
        participants: [user.userId], // Include current user as participant
      };

      // Add the appropriate ID based on type
      if (type === "class") {
        payload.classId = item._id || item.id;
      } else {
        payload.courseId = item._id || item.id;
      }

      console.log("Creating group with payload:", payload);

      const response = await createGroupChat(payload, token);
      console.log("Group created successfully:", response);

      // Refresh chat rooms after creating a group
      refreshChatRooms();

      // Show success notification
      setNotification({
        type: "success",
        message: `${type === "class" ? "Class" : "Course"} group chat created successfully!`
      });
      
      // Close modal after a brief delay
      setTimeout(() => {
        onOpenChange(false);
        setCurrentStep("selection");
        setSearchTerm("");
        setNotification(null);
      }, 2000);
    } catch (error: any) {
      console.error("Error creating group:", error);
      setNotification({
        type: "error",
        message: `Failed to create group: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredClasses = classes?.filter(cls =>
    cls.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredCourses = courses?.filter(course =>
    (course.title || course.name)?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log("Modal opened - Debug info:");
      console.log("Classes:", classes);
      console.log("Courses:", courses);
      console.log("Filtered courses:", filteredCourses);
    }
  }, [open, classes, courses, filteredCourses]);

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#003366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-[#003366]" />
        </div>
        <h3 className="text-lg font-semibold text-[#030E18] mb-2">
          Create New Group
        </h3>
        <p className="text-[#7B7B7B] text-sm">
          Choose how you want to create your group
        </p>
        {isLoadingTerm ? (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs text-[#7B7B7B]">Loading term info...</span>
          </div>
        ) : currentTerm && (
          <div className="mt-2 text-xs text-[#003366] bg-[#003366]/5 px-3 py-1 rounded-full inline-block">
            {currentTerm.name} - {currentTerm.academicYear?.name}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-16 border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366] transition-colors"
          onClick={() => setCurrentStep("class-list")}
          disabled={isLoading}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#003366]/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#003366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#030E18]">Create by Class</p>
              <p className="text-sm text-[#7B7B7B]">
                Group all students in a class ({classes?.length || 0} available)
              </p>
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full h-16 border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366] transition-colors"
          onClick={() => setCurrentStep("course-list")}
          disabled={isLoading}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#003366]/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#003366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-[#030E18]">Create by Course</p>
              <p className="text-sm text-[#7B7B7B]">
                Group students taking a course ({courses?.length || 0} available)
              </p>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderClassList = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-[#030E18]">Select Class</h3>
          <p className="text-sm text-[#7B7B7B]">Choose a class to create group</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#898989] w-4 h-4" />
        <Input
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-[#F0F0F0] focus:border-[#003366]"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#003366]" />
            <span className="ml-2 text-[#7B7B7B]">Loading classes...</span>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#7B7B7B]">
              {searchTerm ? "No classes found matching your search" : "No classes available"}
            </p>
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <Button
              key={cls.id || cls._id}
              variant="outline"
              className="w-full h-14 justify-start border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366]"
              onClick={() => handleCreateGroup(cls, "class")}
              disabled={isCreating}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-[#003366]/10 rounded-lg flex items-center justify-center">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#003366]" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-[#003366]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[#030E18]">{cls.name}</p>
                  <p className="text-sm text-[#7B7B7B]">
                    {cls.students?.length || cls.studentCount || 0} students
                  </p>
                </div>
                {isCreating && (
                  <div className="text-xs text-[#003366]">Creating...</div>
                )}
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );

  const renderCourseList = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-[#030E18]">Select Course</h3>
          <p className="text-sm text-[#7B7B7B]">Choose a course to create group</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#898989] w-4 h-4" />
        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-[#F0F0F0] focus:border-[#003366]"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#003366]" />
            <span className="ml-2 text-[#7B7B7B]">Loading courses...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#7B7B7B]">
              {searchTerm ? "No courses found matching your search" : "No courses available"}
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <Button
              key={course.id || course._id}
              variant="outline"
              className="w-full h-14 justify-start border-[#F0F0F0] hover:bg-[#003366]/5 hover:border-[#003366]"
              onClick={() => handleCreateGroup(course, "course")}
              disabled={isCreating}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-[#003366]/10 rounded-lg flex items-center justify-center text-sm">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#003366]" />
                  ) : (
                    getCourseIcon(course.title || course.name)
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[#030E18]">{course.title || course.name}</p>
                  <p className="text-sm text-[#7B7B7B]">
                    {course.courseCode && (
                      <span className="font-mono">{course.courseCode}</span>
                    )}
                    {course.description && (
                      <span className="ml-1">• {course.description}</span>
                    )}
                  </p>
                </div>
                {isCreating && (
                  <div className="text-xs text-[#003366]">Creating...</div>
                )}
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Reset state when modal closes
      setCurrentStep("selection");
      setSearchTerm("");
      setCurrentTerm(null);
      setIsCreating(false);
      setNotification(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md font-manrope">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>Create a new group for messaging</DialogDescription>
        </DialogHeader>
        
        {notification && (
          <div className={`p-3 rounded-lg mb-4 ${
            notification.type === "success" 
              ? "bg-green-50 border border-green-200 text-green-800" 
              : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center">
                  ✓
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center">
                  ✕
                </div>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        )}
        
        {currentStep === "selection" && renderSelectionStep()}
        {currentStep === "class-list" && renderClassList()}
        {currentStep === "course-list" && renderCourseList()}
      </DialogContent>
    </Dialog>
  );
}
