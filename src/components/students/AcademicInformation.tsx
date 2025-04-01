import React from "react";

interface AcademicInfoProps {
  academicInfo: {
    classLevel: string;
    gradeLevel: string;
  };
}

const AcademicInformation: React.FC<AcademicInfoProps> = ({ academicInfo }) => {
  const academicDetails = [
    { label: "Class:", value: academicInfo.classLevel },
    { label: "Grade Level:", value: academicInfo.gradeLevel },
  ];

  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">Academic Information</p>
      <table className="w-full table-fixed sm:table-auto text-sm">
        <tbody>
          {academicDetails.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="py-2 px-3 text-[#909090] whitespace-nowrap">{item.label}</td>
              <td className="py-2 sm:pr-28 font-medium">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AcademicInformation;
