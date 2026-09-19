"use client";
import { useMemo, useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import LoadingCard from "@/components/LoadingCard";
import { ResourcesHeader } from "@/components/resources/ResourcesHeader";
import { ResourceStatsCards } from "@/components/resources/ResourceStatsCards";
import { ResourcesTable } from "@/components/resources/ResourceTable";
import { UploadModal } from "@/components/resources/uploadmodal";
import { ApiErrorState, EmptyState } from "@/components/states";
import { canWriteRecord, idOf } from "@/hooks/curriculum/access";
import { useWriterContext } from "@/hooks/curriculum/useWriterContext";
import { computeResourceStats, filterResources } from "@/hooks/resources/stats";
import type { Resource } from "@/hooks/resources/types";
import { useMyResources } from "@/hooks/resources/useResources";
import { useTeacherRoster } from "@/hooks/resources/useTeacherRoster";

/** A white panel, the frame of both halves of the page. */
const Panel = ({ children, guide }: { children: ReactNode; guide?: string }) => (
  <div className="bg-white rounded-lg shadow-none border border-[#F0F0F0] p-3 sm:p-6" data-guide={guide}>
    {children}
  </div>
);

/**
 * `/resources`: the teacher's uploaded teaching materials, with search, the
 * three summary cards, and upload / edit / delete for those allowed to.
 *
 * Data comes from one cached query (`useMyResources`); uploads, edits and
 * deletes invalidate it, so the page holds no copy of the list of its own.
 *
 * @returns The page element.
 */
export default function ResourcePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const query = useMyResources();
  const roster = useTeacherRoster();
  const writer = useWriterContext();

  const resources = useMemo(() => query.data ?? [], [query.data]);
  const stats = useMemo(() => computeResourceStats(resources, roster.classes.length), [resources, roster.classes.length]);
  const filtered = useMemo(() => filterResources(resources, searchTerm), [resources, searchTerm]);

  // Teachers upload for courses they teach; sub-admins are shown the control and the API enforces `manage:curriculum`.
  const canUpload =
    writer.role === "school_sub_admin" || (writer.role === "teacher" && (writer.taughtCourseIds?.length ?? 0) > 0);
  // The list is "resources I uploaded", so a missing uploader (an unpopulated reference) still means mine.
  const canModify = (resource: Resource) =>
    canWriteRecord(writer, { ownerId: idOf(resource.uploadedBy ?? writer.ownIds[0]), courseId: resource.courseId });

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 bg-[#F8F8F8] min-h-screen p-3 sm:p-6">
        <Panel>
          <ResourcesHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            canUpload={canUpload}
            onUpload={() => setIsUploadModalOpen(true)}
          />
          <ResourceStatsCards stats={stats} />
        </Panel>

        <Panel guide="resources-list">
          {query.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading resources">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingCard key={i} height="h-32" />
              ))}
            </div>
          ) : query.error ? (
            <ApiErrorState error={query.error} fallback="We couldn't load your resources." onRetry={() => query.refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6 text-[#878787]" />}
              title={searchTerm ? "No resources found" : "No resources yet"}
              message={
                searchTerm
                  ? `No resources match "${searchTerm}". Try a different search term.`
                  : canUpload
                    ? "Start by uploading your first educational resource."
                    : "Resources you upload will appear here."
              }
              actionText={!searchTerm && canUpload ? "Upload Your First Resource" : undefined}
              onAction={!searchTerm && canUpload ? () => setIsUploadModalOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              <h2 className="min-w-0 break-words text-base font-semibold text-[#030E18] sm:text-lg">
                {searchTerm ? `Search Results (${filtered.length})` : `All Resources (${resources.length})`}
              </h2>
              <ResourcesTable resources={filtered} classes={roster.classes} courses={roster.courses} canModify={canModify} />
            </div>
          )}
        </Panel>

        <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      </div>
    </Layout>
  );
}
