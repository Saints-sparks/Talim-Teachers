"use client";
import { useRouter } from "next/navigation";

interface SubjectCardProps {
  _id: string;
  title: string;

}

const SubjectCard: React.FC<SubjectCardProps> = ({
  _id,
  title,

}) => {
  const router = useRouter();

  return (
    <div
      className="p-3 bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden cursor-pointer h-72 flex flex-col gap-2"
      // onClick={() =>
      //   router.push(`/subjects/${subject.toLowerCase().replace(/\s+/g, "-")}`)
      // }
    >
      <div className="w-full h-40 bg-[#F5F7FA] rounded-2xl flex items-center justify-center">
        <p className="text-xl font-semibold text-[#030E18]">{title}</p>
      </div>
      <div className="">
        <h3 className="text-base font-medium text-[#030E18]">{title}</h3>
        <div className="flex items-center gap-2 mt-5 text-[#030E18] text-sm">
          {/* <img
            src={profileImageUrl}
            className="rounded-full w-10 h-10 object-cover"
          /> */}
          <div>
            <p className="font-medium">
              {title}
            </p>
            <p className="text-xs">Teacher</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;
