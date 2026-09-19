import React from "react";
import { FileText, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordId, type ClassOption, type CourseLike } from "@/hooks/resources/display";

const triggerClass = "border-[#F0F0F0] focus:border-[#003366] focus:ring-[#003366] shadow-none";
const contentClass = "text-[#030E18] bg-white border-[#F0F0F0] shadow-none";

/** A label above a field. */
const FieldLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
  <Label htmlFor={htmlFor} className="text-sm font-medium text-[#030E18]">
    {children}
  </Label>
);

/** The dot beside each select option. */
const Dot = () => <div className="w-2 h-2 bg-[#003366] rounded-full"></div>;

/** Props for {@link UploadFormFields}. */
export interface UploadFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  classId: string;
  onClassChange: (classId: string) => void;
  classes: ClassOption[];
  courseId: string;
  onCourseChange: (courseId: string) => void;
  courses: CourseLike[];
  /** True while the teacher's roster is loading. */
  loading: boolean;
  disabled: boolean;
}

/**
 * The name, class and course fields of the upload form. The selects never
 * render an undefined option: a list still loading says so, and an empty list
 * explains what is missing.
 *
 * @param props - See {@link UploadFormFieldsProps}.
 * @param props.name - The resource name.
 * @param props.onNameChange - Called as the name is typed.
 * @param props.classId - The selected class.
 * @param props.onClassChange - Called with the chosen class id.
 * @param props.classes - The class options.
 * @param props.courseId - The selected course.
 * @param props.onCourseChange - Called with the chosen course id.
 * @param props.courses - The course options.
 * @param props.loading - Whether the roster is loading.
 * @param props.disabled - Locks every field (while uploading).
 * @returns The fields element.
 */
export function UploadFormFields({
  name,
  onNameChange,
  classId,
  onClassChange,
  classes,
  courseId,
  onCourseChange,
  courses,
  loading,
  disabled,
}: UploadFormFieldsProps) {
  return (
    <>
      <div className="space-y-2" data-guide="resources-upload-name">
        <FieldLabel htmlFor="resource-name">Resource Name</FieldLabel>
        <Input
          id="resource-name"
          placeholder="e.g., Mathematics Chapter 5 Notes"
          value={name}
          disabled={disabled}
          onChange={(e) => onNameChange(e.target.value)}
          className={triggerClass}
        />
      </div>

      <div className="space-y-2" data-guide="resources-upload-class">
        <FieldLabel htmlFor="class">Class</FieldLabel>
        <Select value={classId || undefined} onValueChange={onClassChange} disabled={disabled || loading || classes.length === 0}>
          <SelectTrigger id="class" className={triggerClass}>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-[#878787]" />
              <SelectValue placeholder={loading ? "Loading classes..." : classes.length === 0 ? "No classes available" : "Select a class"} />
            </div>
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {classes.map((option) => (
              <SelectItem key={option._id} value={option._id}>
                <div className="flex items-center space-x-2">
                  <Dot />
                  <span>{option.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {classes.length === 0 && !loading && (
          <p className="text-xs text-[#878787]">No classes yet. Choosing a course fills in its class.</p>
        )}
        {classes.length > 0 && (
          <p className="text-xs text-[#6F6F6F]">
            {classes.length} class{classes.length !== 1 ? "es" : ""} available
          </p>
        )}
      </div>

      <div className="space-y-2" data-guide="resources-upload-course">
        <FieldLabel htmlFor="course">Course</FieldLabel>
        <Select value={courseId || undefined} onValueChange={onCourseChange} disabled={disabled || loading || courses.length === 0}>
          <SelectTrigger id="course" className={triggerClass}>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#878787]" />
              <SelectValue placeholder={loading ? "Loading courses..." : courses.length === 0 ? "No courses available" : "Select a course"} />
            </div>
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {courses.map((course) => (
              <SelectItem key={recordId(course)} value={recordId(course)}>
                <div className="flex items-center space-x-2">
                  <Dot />
                  <span>{[course.courseCode, course.title].filter(Boolean).join(" - ") || "Untitled course"}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {courses.length === 0 && !loading && (
          <p className="text-xs text-[#878787]">No courses assigned. Please contact your administrator.</p>
        )}
        {courses.length > 0 && (
          <p className="text-xs text-[#6F6F6F]">
            {courses.length} course{courses.length !== 1 ? "s" : ""} available
          </p>
        )}
      </div>
    </>
  );
}
