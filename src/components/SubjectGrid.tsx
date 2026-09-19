"use client";
import { BookOpen, RefreshCw } from "lucide-react";
import SubjectCard from "./SubjectCard";
import LoadingCard from "./LoadingCard";
import { Button } from "./ui/button";
import { useTeacherSubjects } from "@/hooks/subjects/useTeacherSubjects";

const refreshButton =
  "border-[#F0F0F0] text-[#030E18] hover:bg-[#F0F0F0] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800";

/** The page frame: heading plus whatever state the list is in. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full px-3 py-4 sm:px-6">
      <h2 className="mb-4 text-xl font-medium text-[#030E18] dark:text-slate-100">My Subjects</h2>
      {children}
    </div>
  );
}

/**
 * "My Subjects": a card for each course the teacher is assigned to. The
 * courses come from the teacher record loaded at sign-in, so the page has no
 * request of its own; each card fills in its class avatars lazily.
 *
 * @returns The subject list with loading and empty states.
 */
const SubjectGrid: React.FC = () => {
  const { subjects, isLoading, refresh } = useTeacherSubjects();

  if (isLoading && subjects.length === 0) {
    return (
      <Frame>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} height="h-48" />
          ))}
        </div>
      </Frame>
    );
  }

  if (subjects.length === 0) {
    return (
      <Frame>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-800">
            <BookOpen className="w-8 h-8 text-[#878787]" />
          </div>
          <h3 className="text-lg font-medium text-[#030E18] mb-2 dark:text-slate-100">No Subjects Assigned</h3>
          <p className="text-[#6F6F6F] mb-4 dark:text-slate-400">You haven&apos;t been assigned to any subjects yet.</p>
          <Button variant="outline" onClick={() => void refresh()} className={refreshButton}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subject, index) => (
          <SubjectCard key={subject._id || index} {...subject} />
        ))}
      </div>
    </Frame>
  );
};

export default SubjectGrid;
