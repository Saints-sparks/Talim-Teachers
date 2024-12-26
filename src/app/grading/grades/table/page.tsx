'use client'

import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import Button from '@/components/Button'
import { Header } from '@/components/HeaderTwo'

interface Subject {
  name: string
  testScore: number
  examScore: number
  totalScore: number
}

export default function GradingTablePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    const savedScores = localStorage.getItem('gradingScores')
    if (savedScores) {
      const scores = JSON.parse(savedScores)
      const tableSubjects = scores.slice(1).map((score: any) => ({
        name: score.subject,
        testScore: score.test,
        examScore: score.exam,
        totalScore: score.test + score.exam
      }))
      setSubjects(tableSubjects)
      localStorage.removeItem('gradingScores')
    }
  }, [])

  const totalScores = subjects.reduce(
    (acc, subject) => ({
      test: acc.test + subject.testScore,
      exam: acc.exam + subject.examScore,
      total: acc.total + subject.totalScore,
    }),
    { test: 0, exam: 0, total: 0 }
  )

  return (
    <div className="container mx-auto p-4 space-y-6">
        <Header/>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Grading System</h1>
          <p className="text-gray-500">Grade and upload student results effortlessly.</p>
        </div>
        <Button className="bg-[#002147]">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
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
    </div>
  )
}

