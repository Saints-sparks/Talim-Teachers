"use client";
import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/CustomToast";
import { fileNameOf } from "@/components/curriculum/editor/types";
import {
  classOptions,
  formatUploadDate,
  resourceCourseName,
  resourceTermName,
  type ClassLike,
  type CourseLike,
} from "@/hooks/resources/display";
import { refId, type Resource, type ResourceClass, type UpdateResourcePayload } from "@/hooks/resources/types";
import { useUpdateResource } from "@/hooks/resources/useResources";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";

/** Props for {@link UpdateModal}. */
export interface UpdateModalProps {
  /** The resource being edited; the dialog is closed when `null`. */
  resource: Resource | null;
  classes: ClassLike[];
  courses: CourseLike[];
  onClose: () => void;
}

/** A read-only line of the dialog. */
const ReadOnly = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <div className="text-sm text-[#6F6F6F] break-all">{children}</div>
  </div>
);

/** The form inside the dialog; remounted per resource so its state starts fresh. */
function UpdateForm({ resource, classes, courses, onClose }: Omit<UpdateModalProps, "resource"> & { resource: Resource }) {
  const update = useUpdateResource();
  const [name, setName] = useState(resource.name);
  const [classId, setClassId] = useState(refId(resource.classId as ResourceClass | string | null));

  const options = useMemo(() => {
    // The resource's own class stays selectable even if the teacher is no longer assigned to it.
    const own = resource.classId && typeof resource.classId === "object" ? [resource.classId as ClassLike] : [];
    return classOptions([classes, own]);
  }, [classes, resource.classId]);

  const handleUpdate = async () => {
    if (!name.trim() || !classId) {
      toast.error("Please fill all fields");
      return;
    }
    // Only what the form edits: the API's UpdateResourceDto treats every field as optional.
    const payload: UpdateResourcePayload = { name: name.trim(), classId };
    try {
      await update.mutateAsync({ id: resource._id, payload });
      toast.success("Resource updated successfully.");
      onClose();
    } catch (error) {
      logger.error("resources", "update failed", error);
      toast.error(getErrorMessage(error, "Update failed. Please try again."));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Update Resource</DialogTitle>
        <DialogDescription className="sr-only">Change the resource's name or class.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="resource-name">Resource Name</Label>
          <Input id="resource-name" value={name} disabled={update.isPending} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="class">Class</Label>
          <Select value={classId || undefined} onValueChange={setClassId} disabled={update.isPending}>
            <SelectTrigger id="class">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option._id} value={option._id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ReadOnly label="Course">{resourceCourseName(resource, courses)}</ReadOnly>
        <ReadOnly label="Term">{resourceTermName(resource)}</ReadOnly>
        <ReadOnly label="Upload Date">{formatUploadDate(resource.uploadDate)}</ReadOnly>
        {resource.files.length > 0 && (
          <ReadOnly label="Files">
            <ul className="space-y-1">
              {resource.files.map((file) => (
                <li key={file} className="bg-[#F8F8F8] border border-[#F0F0F0] rounded-md px-2 py-1">
                  <a href={file} target="_blank" rel="noopener noreferrer" className="text-[#003366] hover:underline">
                    {fileNameOf(file)}
                  </a>
                </li>
              ))}
            </ul>
          </ReadOnly>
        )}
      </div>
      <div className="flex justify-end">
        <Button className="bg-[#002147] text-white" onClick={handleUpdate} disabled={update.isPending}>
          {update.isPending ? "Updating..." : "Update"}
        </Button>
      </div>
    </>
  );
}

/**
 * The "Update Resource" dialog: rename a resource or move it to another class.
 * The course, term, date and files are shown but not editable, matching what
 * the form has always offered. The dialog locks page scroll while open, and the
 * list refreshes itself when the save succeeds.
 *
 * @param props - See {@link UpdateModalProps}.
 * @param props.resource - The resource being edited, or `null` for closed.
 * @param props.classes - The teacher's classes.
 * @param props.courses - The teacher's courses.
 * @param props.onClose - Closes the dialog.
 * @returns The dialog element.
 */
export function UpdateModal({ resource, classes, courses, onClose }: UpdateModalProps) {
  return (
    <Dialog open={Boolean(resource)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] text-[#030E18] max-h-[85vh] overflow-y-auto">
        {resource && <UpdateForm key={resource._id} resource={resource} classes={classes} courses={courses} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
