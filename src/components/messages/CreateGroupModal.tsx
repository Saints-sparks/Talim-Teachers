"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateGroup } from "@/hooks/messages/useCreateGroup";
import CreateGroupSelectionStep from "./CreateGroupSelectionStep";
import CreateGroupClassList from "./CreateGroupClassList";
import CreateGroupCourseList from "./CreateGroupCourseList";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
}: CreateGroupModalProps) {
  const {
    currentStep,
    goToClassList,
    goToCourseList,
    handleBack,
    searchTerm,
    setSearchTerm,
    currentTerm,
    isLoadingTerm,
    isCreating,
    notification,
    classes,
    courses,
    isLoading,
    handleCreateGroup,
    handleOpenChange,
  } = useCreateGroup(open, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md font-manrope">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Create a new group for messaging
          </DialogDescription>
        </DialogHeader>

        {notification && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              notification.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
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
              <span className="text-sm font-medium">
                {notification.message}
              </span>
            </div>
          </div>
        )}

        {currentStep === "selection" && (
          <CreateGroupSelectionStep
            currentTerm={currentTerm}
            isLoadingTerm={isLoadingTerm}
            isLoading={isLoading}
            classCount={classes?.length || 0}
            courseCount={courses?.length || 0}
            onPickClass={goToClassList}
            onPickCourse={goToCourseList}
          />
        )}
        {currentStep === "class-list" && (
          <CreateGroupClassList
            classes={classes}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isLoading={isLoading}
            isCreating={isCreating}
            onBack={handleBack}
            onSelect={(cls) => handleCreateGroup(cls, "class")}
          />
        )}
        {currentStep === "course-list" && (
          <CreateGroupCourseList
            courses={courses}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isLoading={isLoading}
            isCreating={isCreating}
            onBack={handleBack}
            onSelect={(course) => handleCreateGroup(course, "course")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
