import { Student } from "../../types/student";
import { Pencil } from "lucide-react";
import Button from "../Button";

interface BehavioralDataProps {
  student: Student;
}

export function BehavioralData({ student }: BehavioralDataProps) {
  const extracurricularActivities = [
    "Member of the Science Club",
    "School Debate Team Participant",
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 items-start">
      {/* Left Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border">
          <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
            <h3 className="font-medium">Behavioral/Engagement Data</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <span className=" text-[#969696]">Edit</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">Attendance Rate:</span>
              <span className="text-[#525252]">95%</span>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">Class Participation:</span>
              <span className="text-[#525252]">Active (Consistently engages in class discussions)</span>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">Disciplinary Records:</span>
              <span className="text-[#525252]">None</span>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 ">
              <span className="text-gray-600">Behavior Rating:</span>
              <span className="text-[#525252]">Excellent</span>
            </div>
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
              <span className="text-[#525252]">2024/2025</span>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 border-b">
              <span className="text-gray-600">
                Overall Academic Performance:
              </span>
              <span className="text-[#525252]">85%</span>
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

          <div className="space-y-1">
            {extracurricularActivities.map((activity) => (
              <div key={activity} className="text-gray-700 px-4 py-2">
                {activity}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border">
          <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
            <h3 className="font-medium">Teacher Feedback</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <span className=" text-[#969696]">Edit</span>
            </div>
          </div>
          <p className="text-gray-700 px-4 py-3 border-b">
            Emeka is highly engaged in class activities, shows leadership
            qualities, and consistently demonstrates respectful behavior.
          </p>
        </div>
    </div>
  );
}
