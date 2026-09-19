"use client";
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/curriculum/ConfirmDeleteDialog";
import { toast } from "@/components/CustomToast";
import {
  formatUploadDate,
  resourceClassName,
  resourceCourseName,
  resourceUrl,
  type ClassLike,
  type CourseLike,
} from "@/hooks/resources/display";
import type { Resource } from "@/hooks/resources/types";
import { useDeleteResource } from "@/hooks/resources/useResources";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { ResourceRowActions } from "./ResourceRowActions";
import { UpdateModal } from "./UpdateModal";

/** Props for {@link ResourcesTable}. */
export interface ResourcesTableProps {
  resources: Resource[];
  /** The teacher's classes, to name a resource's class when the API sends only an id. */
  classes: ClassLike[];
  /** The teacher's courses; the API populates only a course's description, so titles come from here. */
  courses: CourseLike[];
  /** Whether the signed-in teacher may edit or delete this resource. */
  canModify: (resource: Resource) => boolean;
}

/** One labelled value of a mobile card. */
const CardField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[12px] text-black font-medium dark:text-slate-200">{label}</p>
    <p className="break-words text-[14px] text-[#676767] dark:text-slate-300">{children}</p>
  </div>
);

/**
 * The teacher's resources: a table from `md` up, cards below it. Editing and
 * deleting live here; the list itself is refreshed by cache invalidation, so
 * there is no local copy to keep in step.
 *
 * @param props - See {@link ResourcesTableProps}.
 * @param props.resources - The resources to show.
 * @param props.classes - The teacher's classes.
 * @param props.courses - The teacher's courses.
 * @param props.canModify - Whether a resource may be edited or deleted.
 * @returns The list element.
 */
export function ResourcesTable({ resources, classes, courses, canModify }: ResourcesTableProps) {
  const [editing, setEditing] = useState<Resource | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const deleteMutation = useDeleteResource();
  const deletingId = deleteMutation.isPending ? pendingDelete?._id : undefined;

  const view = (resource: Resource) => {
    const url = resourceUrl(resource);
    if (!url) {
      toast.error("No file available for this resource.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete._id);
      toast.success("Resource deleted");
      setPendingDelete(null);
    } catch (error) {
      logger.error("resources", "delete failed", error);
      toast.error(getErrorMessage(error, "Could not delete the resource. Please try again."));
    }
  };

  const actions = (resource: Resource, variant: "desktop" | "mobile") => (
    <ResourceRowActions
      variant={variant}
      canModify={canModify(resource)}
      deleting={deletingId === resource._id}
      onView={() => view(resource)}
      onEdit={() => setEditing(resource)}
      onDelete={() => setPendingDelete(resource)}
    />
  );

  return (
    <div>
      <div className="bg-white rounded-lg hidden md:block overflow-x-auto">
        <Table className="text-[#030303] bg-white">
          <TableHeader className="text-[#030E18]">
            <TableRow>
              <TableHead className="flex gap-2 items-center">Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="flex justify-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource._id}>
                <TableCell>
                  <div className="flex items-center gap-2 p-5">
                    <span className="text-[#030303]">{resource.name}</span>
                  </div>
                </TableCell>
                <TableCell>{resourceClassName(resource, classes)}</TableCell>
                <TableCell>{resourceCourseName(resource, courses)}</TableCell>
                <TableCell className="text-[#616161]">{formatUploadDate(resource.uploadDate)}</TableCell>
                <TableCell className="flex justify-center items-center">
                  <div className="flex items-center gap-2">{actions(resource, "desktop")}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="block md:hidden space-y-4 mt-4">
        {resources.map((resource) => (
          <div key={resource._id} className="rounded-lg border border-[#F0F0F0] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[12px] text-black font-medium mb-1 dark:text-slate-200">Name</p>
            <p className="break-words text-[14px] text-[#676767] dark:text-slate-300">{resource.name}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-2">
              <CardField label="Class">{resourceClassName(resource, classes)}</CardField>
              <CardField label="Course">{resourceCourseName(resource, courses)}</CardField>
              <CardField label="Upload Date">{formatUploadDate(resource.uploadDate)}</CardField>
            </div>
            <div className="mt-4 flex items-center gap-2">{actions(resource, "mobile")}</div>
          </div>
        ))}
      </div>

      <UpdateModal
        resource={editing}
        classes={classes}
        courses={courses}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        title="Delete resource?"
        subject={pendingDelete?.name || "this resource"}
        busy={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
