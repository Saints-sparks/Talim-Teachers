import React from "react";

const studentDetails = [
  { label: "Highest Degree:", value: "PhD" },
  { label: "Years of Experience:", value: "2 Years" },
  { label: "Subject Expertise:", value: "Mathematics" },
];

const Qualifications = () => {
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
