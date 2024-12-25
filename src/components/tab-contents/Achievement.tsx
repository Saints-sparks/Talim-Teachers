import { Student } from "../../types/student";
import { Pencil } from "lucide-react";
import Button from "../Button";

interface AchievementProps {
  student: Student;
}

export function Achievement({ student }: AchievementProps) {
  const awards = [
    "Mathematics Olympiad Winner (State Level, 2023)",
    "Best Science Student (School Award, 2022)",
  ];

  const certificates = [
    "First Aid Training Certification (2023)",
    "Leadership Program Certificate (2022)",
  ];

  const extracurricular = [
    "Debate Team Captain (2022-2023)",
    "Football Team Member (2021-Present)",
  ];

  const communityService = [
    "Volunteered for School's Environmental Clean-Up Campaign (2023)",
    "Tutored Junior Students in Math and Science (2022-Present)",
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6 items-start">
      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium">Awards & Recognitions</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>
        <ul className="list-disc pl-9 space-y-2 text-[#969696]">
          {awards.map((award) => (
            <li className="px-4 py-3" key={award}>
              {award}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium">Certificates</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>
        <ul className="list-disc pl-9 space-y-2 text-[#969696]">
          {certificates.map((certificate) => (
            <li className="px-4 py-3" key={certificate}>{certificate}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium">Extracurricular Activities</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>
        <ul className="list-disc pl-9 space-y-2 text-[#969696]">
          {extracurricular.map((activity) => (
            <li className="px-4 py-3" key={activity}>{activity}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4 px-4 py-3 border-b text-black font-medium bg-gray-50 ">
          <h3 className="font-medium">Community Service</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <span className=" text-[#969696]">Edit</span>
          </div>
        </div>
        <ul className="list-disc pl-9 space-y-2 text-[#969696]">
          {communityService.map((service) => (
            <li className="px-4 py-3" key={service}>{service}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
