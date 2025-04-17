import { useMemo } from "react";

interface Subject {
  name: string;
  testScore: number;
  examScore: number;
  totalScore: number;
}

interface GradingTableProps {
  subjects: Subject[];
  onGradeClick?: () => void;
}

export function GradingTable({ subjects, onGradeClick }: GradingTableProps) {
  const calculateTotalScores = (subjects: Subject[]) =>
    subjects.reduce(
      (acc, subject) => ({
        test: acc.test + subject.testScore,
        exam: acc.exam + subject.examScore,
        total: acc.total + subject.totalScore,
      }),
      { test: 0, exam: 0, total: 0 }
    );

  const totalScores = useMemo(() => calculateTotalScores(subjects), [subjects]);

  if (subjects.length === 0) {
    return (
      <div className="text-center text-gray-500">No subjects to display.</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow text-black">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Subject</th>
            <th className="text-left p-4">Test Score (30%)</th>
            <th className="text-left p-4">Exam Score (70%)</th>
            <th className="text-left p-4">Total Score (100%)</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.name} className="border-b hover:bg-gray-100">
              <td className="p-4">{subject.name}</td>
              <td className="p-4">{subject.testScore}</td>
              <td className="p-4">{subject.examScore}</td>
              <td className="p-4">{subject.totalScore}</td>
              <td className="p-4">
                <button
                  onClick={() => onGradeClick?.()}
                  className="bg-blue-500 text-white rounded px-2 py-1"
                >
                  Grade
                </button>
              </td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="p-4">TOTAL</td>
            <td className="p-4">{totalScores.test}</td>
            <td className="p-4">{totalScores.exam}</td>
            <td className="p-4">
              {totalScores.total}/{subjects.length * 100}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
