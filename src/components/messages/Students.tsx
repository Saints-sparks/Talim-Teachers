import { Plus, Search, X } from "lucide-react";
import React from "react";
import { Input } from "../ui/input";
import { Avatar, AvatarImage } from "../ui/avatar";

const Students = () => {
  const members = [
    {
      name: "Mrs. Yetunde Adebayo",
      avatar: "/image/teachers/english.png",
      role: "Teacher",
    },
    {
      name: "Fatima Abubakar",
      avatar: "/image/teachers/mathematics.png",
      role: "Student",
    },
    {
      name: "Fatima Abubakar",
      avatar: "/image/teachers/mathematics.png",
      role: "Student",
    },
    {
      name: "Fatima Abubakar",
      avatar: "/image/teachers/mathematics.png",
      role: "Student",
    },
    {
      name: "Fatima Abubakar",
      avatar: "/image/teachers/mathematics.png",
      role: "Student",
    },
    {
      name: "Fatima Abubakar",
      avatar: "/image/teachers/mathematics.png",
      role: "Student",
    },
  ];
  return (
    <div className="mt-2">
      <div className="relative flex items-center border px-2 py-1 rounded-lg ">
        <Search strokeWidth="1px" size={20} />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-transparent p-2 text-sm focus:outline-none"
        />
        <X className="text-gray-500 cursor-pointer ml-2" size={16} />
      </div>
      <div className="flex flex-col overflow-y-auto max-h-[320px] scrollbar-hide">
        <div className="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-gray-200">
          <Plus />
          <div className="flex-1">
            <p className=" text-[16px]">Add Student</p>
            <p className="text-sm text-[#7B7B7B]">Add student to group</p>
          </div>
        </div>
        {members.map((mem, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded cursor-pointer hover:bg-gray-200"
          >
            <Avatar className="w-10 h-10 rounded-full bg-gray-300">
              <AvatarImage src={mem.avatar} />
            </Avatar>
            <div className="flex-1">
              <p className=" text-[16px]">{mem.name}</p>
              <p className="text-sm text-[#7B7B7B]">{mem.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Students;
