import React from "react";
import { Course, TeacherClass } from "@/types/student";

interface ClassAndSubjectsProps {
  assignedClasses: TeacherClass[];
  assignedCourses: Course[];
}

const ClassAndSubjects = ({
  assignedClasses,
  assignedCourses,
}: ClassAndSubjectsProps) => {
  const classNames =
    assignedClasses.length > 0
      ? assignedClasses.map((classObj) => classObj.name).join(", ")
      : "No classes assigned";

  const courseNames =
    assignedCourses.length > 0
      ? assignedCourses
          .map((course) => `${course.courseCode} - ${course.title}`)
          .join(", ")
      : "No subjects assigned";

  const studentDetails = [
    {
      label: "Subjects to Teach:",
      value: courseNames,
    },
    { label: "Assigned Classes:", value: classNames },
  ];

  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">Class and Subjects</p>
      <table className="w-full table-fixed sm:table-auto text-sm">
        <tbody className="w-full">
          {studentDetails.map((item, index) => (
            <tr key={index} className="border-t w-full">
              <td className="py-2 px-3 text-[#909090]  whitespace-nowrap">
                {item.label}
              </td>
              <td className="py-2 px-30 sm:px-28 font-medium break-words">
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClassAndSubjects;
