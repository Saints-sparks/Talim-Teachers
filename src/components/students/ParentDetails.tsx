import React from "react";

const parentDetails = [
  { label: "First Name:", value: "Emeka" },
  { label: "Last Name:", value: "Adewale" },
  { label: "Phone Number:", value: "+234XXXXX" },
  { label: "Email Address:", value: "emekadewale@gmail.com" },
  { label: "Relationship to student:", value: "Parent" },
];

const ParentDetails = () => {
  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">
        Parent/Guardian Information
      </p>
      <table className="w-full table-fixed sm:table-auto text-sm">
        <tbody className="w-full">
          {parentDetails.map((item, index) => (
            <tr key={index} className="border-t w-full overflow-x-auto">
              <td className="py-2 px-3 text-[#909090] w-2/3 sm:w-auto whitespace-nowrap">
                {item.label}
              </td>
              <td className="py-2  w-1/3 sm:px-28 sm:w-auto font-medium break-words whitespace-normal ">
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParentDetails;
