import Image from "next/image";
import { Menu } from "@headlessui/react";
import { MoreVertical, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";

interface Student {
  name: string;
  classLevel: string;
  imageUrl: string;
  id: number;
}

interface StudentCardProps {
  student: Student; // Expect the full student object
}

export const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="relative border border-[#F0F0F0] rounded-md p-4 bg-white w-full max-w-sm shadow-none">
      {/* Dropdown Menu */}
      <Menu as="div" className="absolute top-2 right-2 text-left">
        <Menu.Button className="flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-10">
          <Menu.Item>
            {({ active }) => (
              <Link href={`/students/${student.id}`}>
                <button
                  className={`block w-full text-left px-4 py-2 text-sm text-[#030E18] ${
                    active ? "bg-gray-100" : ""
                  }`}
                >
                  View Profile
                </button>
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                className={`block w-full text-left px-4 py-2 text-sm text-[#030E18] ${
                  active ? "bg-gray-100" : ""
                }`}
              >
                Edit
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                className={`block w-full text-left px-4 py-2 text-sm text-red-600 ${
                  active ? "bg-gray-100" : ""
                }`}
              >
                Delete
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>

      {/* Student Details */}
      <div className="flex flex-col  items-center gap-3">
        <Image
          src={student.imageUrl}
          alt={student.name}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
        <div>
          <h3 className="text-[18px] text-[#030E18] font-manrope font-medium leading-[28px]">
            {student.name}
          </h3>
          <p className="text-[18px] text-[#030E18] font-manrope font-normal leading-[28px] text-center">
            {student.classLevel}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <button className="flex-1 bg-white text-[#434343] border border-[#F6F6F6] shadow-none px-4 py-2 rounded-md flex items-center justify-center gap-2 rounded-2xl   hover:bg-gray-50">
          <Phone className="w-4 h-4 text-[#6F6F6F]" />
          Call
        </button>
        <button className="flex-1 bg-white text-[#434343] border border-[#F6F6F6] shadow-none px-4 py-2 rounded-md flex items-center justify-center gap-2 rounded-2xl hover:bg-gray-50">
          <MessageCircle className="w-4 h-4 text-[#6F6F6F]" />
          Chat
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
