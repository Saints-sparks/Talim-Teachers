"use client";
import SubjectCard from "./SubjectCard";

const subjects = [
  {
    subject: "English Language",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/english.png",
    profileImageUrl: "/image/teachers/english.png",
  },
  {
    subject: "Mathematics",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/mathematics.png",
    profileImageUrl: "/image/teachers/mathematics.png",
  },
  {
    subject: "Civic Education",
    title: "Mrs",
    name: "Yetunde Adebayo",
    subjectImageUrl: "/image/subject/civic-education.png",
    profileImageUrl: "/image/teachers/civic.png",
  },
];

const SubjectGrid: React.FC = () => {
  return (
    <div className="px-6 py-4 h-full">
      <h2 className="text-xl font-medium mb-4 text-[#030E18]">My Subjects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subject, index) => (
          <SubjectCard key={index} {...subject} />
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;
