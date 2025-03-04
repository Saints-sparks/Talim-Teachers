"use client";
import { useRouter } from "next/navigation";

interface SubjectCardProps {
  subject: string;
  title: string;
  name: string;
  subjectImageUrl: string;
  profileImageUrl: string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, title, name, subjectImageUrl , profileImageUrl }) => {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-[#F0F0F0] overflow-hidden cursor-pointer h-72"
      onClick={() => router.push(`/subjects/${subject.toLowerCase().replace(/\s+/g, "-")}`)}
    >
      <img src={subjectImageUrl} alt={subject} className="w-full h-40 object-cover p-3 rounded-2xl mx-auto"/>
      <div className="p-4">
      <h3 className="text-base font-medium text-[#030E18]">{subject}</h3>
      <div className="flex items-center gap-2 mt-5 text-[#030E18] text-sm">
      <img src={profileImageUrl} className="rounded-full w-10 h-10 object-cover" />
      <div>
      <p className="font-medium">{title}.{name}</p>
      <p className="text-xs">Teacher</p>
      </div>
      </div>
      </div>
    </div>
  );
};

export default SubjectCard;
