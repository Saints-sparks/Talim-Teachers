'use client'

import { GradingModal } from '@/components/grading/grading-modal'
import { GradingTable } from '@/components/grading/grading-table'
import { useState } from 'react'


const initialSubjects = [
  {
    name: 'Mathematics',
    testScore: 24,
    examScore: 56,
    totalScore: 80
  },
  {
    name: 'English Language',
    testScore: 27,
    examScore: 61,
    totalScore: 88
  }
]

export default function GradingPage({onGradeClick}: {onGradeClick: () => void}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subjects, setSubjects] = useState(initialSubjects)

  const handleGradeSubmit = (scores: { test: number; exam: number }[]) => {
    // Update subjects with new scores
    setIsModalOpen(false)
  }

  return (
    <>
      <GradingTable 
        subjects={subjects} 
        onGradeClick={() => setIsModalOpen(true)} 
      />
      <GradingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleGradeSubmit}
      />
    </>
  )
}

