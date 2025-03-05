import React from "react";
import { Student } from "../../types/student";

interface PersonalInformationProps {
  student: Student;
}

function PersonalInfo({ student }: PersonalInformationProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 items-start">
      {/* Student Details */}
      <div className="bg-white border-[1.5px] rounded-lg space-y-4">
        <h3 className="px-4 py-3 border-b text-black font-medium bg-gray-50">
          Student details
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Full Name:</span>
            <span className="font-medium text-[#030E18]">
              {student.fullName}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">
              Class/Grade Level:
            </span>
            <span className="font-medium text-[#030E18]">{student.class}</span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Student ID:</span>
            <span className="font-medium text-[#030E18]">
              {student.studentId}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Date of Birth:</span>
            <span className="font-medium text-[#030E18]">
              {student.dateOfBirth}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Gender:</span>
            <span className="font-medium text-[#030E18]">{student.gender}</span>
          </div>
        </div>
      </div>


      {/* Guardian/Parent Information */}
      <div className="bg-white border-[1.5px] rounded-lg space-y-4 h-auto">
        <h3 className="px-4 py-3 border-b text-black font-medium bg-gray-50">
          Guardian/Parent Information:
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Father's Name:</span>
            <span className="font-medium text-[#030E18]">
              {student.father.name}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">
              Father's Contact Details:
            </span>
            <span className="font-medium text-[#030E18]">
              {student.father.contactDetails}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Mother's Name:</span>
            <span className="font-medium text-[#030E18]">
              {student.mother.name}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">
              Mother's Contact Details:
            </span>
            <span className="font-medium text-[#030E18]">
              {student.mother.contactDetails}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Guardian's Name:</span>
            <span className="font-medium text-[#030E18]">
              {student.guardian.name}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">
              Guardian's Contact Details:
            </span>
            <span className="font-medium text-[#030E18]">
              {student.guardian.contactDetails}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 bg-white border-[1.5px] rounded-lg mt-[-60px]">
        <h3 className="px-4 py-3 border-b text-black font-medium bg-gray-50">Contact Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Phone Number:</span>
            <span className="font-medium text-[#030E18]">
              {student.contact.phoneNumber}
            </span>
          </div>
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="font-medium text-[#8F8F8F]">Email address:</span>
            <span className="font-medium text-[#030E18]">
              {student.contact.emailAddress}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalInfo;
