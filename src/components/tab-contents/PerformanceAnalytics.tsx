import { Student } from "../../types/student";
import { Pencil } from "lucide-react";
import Button from "../Button";

interface PerformanceAnalyticsProps {
  student: Student;
}

export function PerformanceAnalytics({ student }: PerformanceAnalyticsProps) {
  const subjectStrengths = [
    { subject: "Mathematics", score: "92%" },
    { subject: "Physics", score: "90%" },
    { subject: "English Language", score: "85%" },
  ];

  const areasForImprovement = [
    { subject: "Chemistry", score: "75%" },
    { subject: "Biology", score: "78%" },
    { subject: "English Language", score: "85%" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 items-start">
      {/* Left Column */}
      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium">Performance Analysis</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600">Overall Performance:</span>
            <span className="text-[#030E18] font-medium">88% (Above Average)</span>
          </div>

          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600 block mb-2">Subject Strengths:</span>
            <div className="space-y-2">
              {subjectStrengths.map((item) => (
                <div key={item.subject} className="flex justify-between text-[#030E18] font-medium ">
                  <span>{item.subject}:</span>
                  <span>{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 px-4 py-3 border-b">
            <span className="text-gray-600 block mb-2">
              Areas for Improvement:
            </span>
            <div className="space-y-2">
              {areasForImprovement.map((item) => (
                <div key={item.subject} className="flex justify-between text-[#030E18] font-medium">
                  <span>{item.subject}:</span>
                  <span>{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b">
            <span className="text-gray-600">Class Rank:</span>
            <span className="text-[#030E18] font-medium">5th out of 50</span>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border">
          <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
            <h3 className="font-medium">Academic Performance</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <span className=" text-[#969696]">Edit</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">Academic Year:</span>
              <span className="text-[#030E18] font-medium">2024/2025</span>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">
                Overall Academic Performance:
              </span>
              <span className="text-[#030E18] font-medium">85%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
            <h3 className="font-medium">
              Engagement in Extracurricular Activities
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <span className=" text-[#969696]">Edit</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">Recent Math Test:</span>
              <span className="text-[#030E18] font-medium">94%</span>
            </div>
            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">End-of-Term Exams:</span>
              <span className="text-[#030E18] font-medium">88%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
            <h3 className="font-medium">Teacher Remarks</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <span className=" text-[#969696]">Edit</span>
            </div>
          </div>
          <p className="text-gray-700 px-4">
            Emeka is highly engaged in class activities, shows leadership
            qualities, and consistently demonstrates respectful behavior.
          </p>
        </div>
      </div>
    </div>
  );
}
