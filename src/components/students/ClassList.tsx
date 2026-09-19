import React from "react";
import { GraduationCap } from "lucide-react";
import ClassCard from "@/components/ClassCard";
import { Button } from "../ui/button";
import LoadingCard from "../LoadingCard";
import SectionHeader from "@/components/ui/section-header";
import type { TeacherClass } from "@/app/context/AppContext";

interface ClassListProps {
  classes: TeacherClass[];
  contextLoading: boolean;
  refreshClasses: () => void;
  onSelect: (classItem: TeacherClass) => void;
}

const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
const refreshButton =
  "border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0] dark:border-[#263A5C] dark:text-slate-100 dark:hover:bg-[#132742]";

/**
 * The teacher's classes as cards, with loading and empty states.
 *
 * @param props - Component props.
 * @returns The class list.
 */
const ClassList: React.FC<ClassListProps> = ({ classes, contextLoading, refreshClasses, onSelect }) => {
  return (
    <div className="space-y-6">
      <div data-guide="students-classes-header">
        <SectionHeader
          title="My Classes"
          subtitle="Classes you teach, all in one place"
          icon={<GraduationCap className="w-6 h-6 text-[#003366]" />}
          actions={
            <Button variant="outline" onClick={refreshClasses} className={refreshButton}>
              Refresh
            </Button>
          }
        />
      </div>
      {contextLoading ? (
        <div className={gridClass} data-guide="students-class-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingCard key={i} height="h-48" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12" data-guide="students-class-grid">
          <GraduationCap className="w-16 h-16 text-[#F0F0F0] mx-auto mb-4 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-[#030E18] mb-2 dark:text-slate-100">No Classes Found</h3>
          <p className="text-[#6F6F6F] mb-4 dark:text-slate-400">You haven&apos;t been assigned to any classes yet.</p>
          <Button variant="outline" onClick={refreshClasses} className={refreshButton}>
            Refresh Classes
          </Button>
        </div>
      ) : (
        <div className={gridClass} data-guide="students-class-grid">
          {classes.map((classItem) => (
            <ClassCard key={classItem._id} classItem={classItem} onView={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassList;
