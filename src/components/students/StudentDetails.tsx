import React from "react";

const studentDetails = [
  { label: "First Name:", value: "Emeka" },
  { label: "Last Name:", value: "Adewale" },
  { label: "Phone Number:", value: "+234XXXXX" },
  { label: "Email Address:", value: "emeka@gmail.com" },
  { label: "Date Of Birth:", value: "12/10/2024" },
  { label: "Gender:", value: "Male" },
];

const StudentDetails = () => {
  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">Student details</p>
      <table className="w-full table-fixed sm:table-auto text-sm">
        <tbody className="w-full">
          {studentDetails.map((item, index) => (
            <tr key={index} className="border-t w-full">
              <td className="py-2 px-3 text-[#909090]  whitespace-nowrap">{item.label}</td>
              <td className="py-2 px-30 sm:px-28 font-medium break-words">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentDetails;
