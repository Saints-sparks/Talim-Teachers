'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'
import { Pencil } from 'lucide-react'

interface StudentCardProps {
  student: {
    id: number
    name: string
    class: string
    imageUrl: string
    isGraded: boolean
  }
}



export function StudentCard({ student }: StudentCardProps) {
  const router = useRouter()

  const handleGradeClick = () => {
    router.push(`/grading/grades/${student.id}`)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm text-[#030E18]">
      <div className="flex justify-end mb-2">
        <button className="text-sm text-gray-600 hover:text-gray-900">
          Edit
        </button>
      </div>
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative w-20 h-20">
          <Image
            src={student.imageUrl}
            alt={student.name}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium">{student.name}</h3>
          <p className="text-sm text-gray-600">{student.class}</p>
        </div>
        <Button
          variant={student.isGraded ? "secondary" : "primary"}
          className={`w-[60%] ${student.isGraded ? 'bg-gray-200 text-gray-700' : 'bg-[#003366]'}`}
          onClick={handleGradeClick}
        >
          {student.isGraded ? (
            <>
              <span className="mr-2">✓</span>
              Graded
            </>
          ) : (
            <div className='flex items-center gap-1 '>
             <Image src="/icons/medal-star.svg" alt="School" width={30.29} height={30.23}/>
              Grade
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}

