import React from "react";

interface AvailabilityProps {
  availableDays: string[];
  availableTime: string;
}

const Qualifications = ({
  availableDays,
  availableTime,
}: AvailabilityProps) => {
  const studentDetails = [
    { label: "Available Days:", value: availableDays.length > 0 ? availableDays.join(", ") : "No days available" },
    { label: "Available Time:", value: availableTime },
  ];

  return (
    <div className="w-full mx-auto bg-white shadow-sm rounded-lg border">
      <p className="p-3 bg-[#F9F9F9] text-[#454545]">Availability</p>
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
