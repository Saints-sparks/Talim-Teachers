import Image from "next/image";
import { Menu } from "@headlessui/react";
import { MoreVertical, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { StudentCardProps } from "@/types/student";

export const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="relative border border-[#F0F0F0] rounded-xl p-4 bg-white w-full max-w-[300px] mx-auto shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Dropdown Menu */}
      <Menu as="div" className="absolute top-2 right-2 text-left">
        <Menu.Button className="flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full h-8 w-8 transition-colors">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-10 border border-gray-200">
          <Menu.Item>
            {({ active }) => (
              <Link href={`/students/${student._id}`}>
                <button
                  className={`block w-full text-left px-4 py-2 text-sm text-[#030E18] transition-colors ${
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
                className={`block w-full text-left px-4 py-2 text-sm text-[#030E18] transition-colors ${
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
                className={`block w-full text-left px-4 py-2 text-sm text-red-600 transition-colors ${
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
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/image/dash/ade.png"
          alt={`${student.userId.firstName} ${student.userId.lastName}`}
          width={90}
          height={90}
          className="rounded-full object-cover border-2 border-gray-100"
        />
        <div className="text-center">
          <p className="font-medium text-[#030E18] text-base">
            {student.userId.firstName} {student.userId.lastName}
          </p>
          <p className="text-[#4A4A4A] text-sm mt-1">{student.classId.name}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <button className="flex-1 bg-white text-[#434343] border border-[#F6F6F6] py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <Phone className="w-4 h-4 text-[#6F6F6F]" />
          <span className="text-sm">Call</span>
        </button>
        <button className="flex-1 bg-white text-[#434343] border border-[#F6F6F6] py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <MessageCircle className="w-4 h-4 text-[#6F6F6F]" />
          <span className="text-sm">Chat</span>
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
