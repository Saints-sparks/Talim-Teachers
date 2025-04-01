import React from "react";

interface ParentDetailsProps {
  parent: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    relationship: string;
  };
}

const ParentDetails: React.FC<ParentDetailsProps> = ({ parent }) => {
  const parentDetails = [
    { label: "First Name:", value: parent.firstName },
    { label: "Last Name:", value: parent.lastName },
    { label: "Phone Number:", value: parent.phoneNumber },
    { label: "Email Address:", value: parent.email },
    { label: "Relationship to Student:", value: parent.relationship },
  ];

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
              <td className="py-2 w-1/3 sm:px-28 sm:w-auto font-medium break-words whitespace-normal">
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
