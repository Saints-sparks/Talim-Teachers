import React from "react";

interface QualififcationsProps {
  highestAcademicQualification: string;
  yearsOfExperience: number;
  specialization: string;
}



const Qualifications = ({highestAcademicQualification, yearsOfExperience, specialization} : QualififcationsProps) => {

  const studentDetails = [
    { label: "Highest Degree:", value: highestAcademicQualification },
    { label: "Years of Experience:", value: yearsOfExperience},
    { label: "Subject Expertise:", value: specialization },
  ];

  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">
        Qualifications and Experience
      </p>
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

export default Qualifications;
