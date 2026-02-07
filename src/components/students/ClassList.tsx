import React from "react";
import ClassCard from "@/components/ClassCard";
import { Button } from "../ui/button";
import { GraduationCap } from "lucide-react";
import LoadingCard from "../LoadingCard";
import SectionHeader from "@/components/ui/section-header";

interface ClassListProps {
  classes: any[];
  contextLoading: boolean;
  refreshClasses: () => void;
  onSelect: (classItem: any) => void;
}

const ClassList: React.FC<ClassListProps> = ({
  classes,
  contextLoading,
  refreshClasses,
  onSelect,
}) => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Classes"
        subtitle="Classes you teach, all in one place"
        icon={<GraduationCap className="w-6 h-6 text-[#003366]" />}
        actions={
          <Button
            variant="outline"
            onClick={refreshClasses}
            className="border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0]"
          >
            Refresh
          </Button>
        }
      />
      {/* Classes grid or states */}
      {contextLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingCard key={i} height="h-48" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 text-[#F0F0F0] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#030E18] mb-2">
            No Classes Found
          </h3>
          <p className="text-[#6F6F6F] mb-4">
            You haven't been assigned to any classes yet.
          </p>
          <Button
            variant="outline"
            onClick={refreshClasses}
            className="border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0]"
          >
            Refresh Classes
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map((classItem) => (
            <ClassCard
              key={classItem._id}
              classItem={classItem}
              onView={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassList;
