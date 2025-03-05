'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { StudentCard } from './student-card'

const students = Array(9).fill(null).map((_, i) => ({
  id: i + 1,
  name: 'Emeka Adewale',
  class: 'SS 3',
  imageUrl: '/image/dash/ade.png',
  isGraded: i === 0 // First student is graded, others aren't
}))

export function GradingSystem() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-start text-[#030E18]">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Grading System</h1>
          <p className="text-gray-500">Grade and upload student results effortlessly.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search for students"
            className="pl-10 pr-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  )
}

