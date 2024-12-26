import { useMemo } from 'react'

interface Subject {
  name: string
  testScore: number
  examScore: number
  totalScore: number
}

interface GradingTableProps {
  subjects: Subject[]
  onGradeClick?: () => void
}

export function GradingTable({ subjects, onGradeClick }: GradingTableProps) {
  const totalScores = useMemo(() => subjects.reduce(
    (acc, subject) => ({
      test: acc.test + subject.testScore,
      exam: acc.exam + subject.examScore,
      total: acc.total + subject.totalScore,
    }),
    { test: 0, exam: 0, total: 0 }
  ), [subjects])

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
            <tr key={subject.name} className="border-b">
              <td className="p-4">{subject.name}</td>
              <td className="p-4">{subject.testScore}</td>
              <td className="p-4">{subject.examScore}</td>
              <td className="p-4">{subject.totalScore}</td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="p-4">TOTAL</td>
            <td className="p-4">{totalScores.test}</td>
            <td className="p-4">{totalScores.exam}</td>
            <td className="p-4">{totalScores.total}/600</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

