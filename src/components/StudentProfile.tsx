'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import Button from '@/components/Button'
import { Student } from '@/types/student'
import PersonalInfo from '@/components/tab-contents/PersonalInfo'
import { AcademicInformation } from '@/components/tab-contents/AcademicInformation'
import { BehavioralData } from '@/components/tab-contents/BehavioralData'
import { PerformanceAnalytics } from '@/components/tab-contents/PerformanceAnalytics'
import { Achievement } from '@/components/tab-contents/Achievement'

const tabs = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'academic', label: 'Academic Information' },
  { id: 'behavioral', label: 'Behavioral/Engagement Data' },
  { id: 'performance', label: 'Performance Analytics' },
  { id: 'achievement', label: 'Achievement' },
]

// This function simulates fetching student data from an API
const fetchStudentData = async (id: string): Promise<Student> => {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay
  return {
    id,
    fullName: 'Emeka Adewale',
    class: 'SS 3',
    studentId: id,
    dateOfBirth: 'January 15, 2005',
    gender: 'Female',
    status: 'Online',
    contact: {
      phoneNumber: '+234 701 234 5678',
      emailAddress: 'emeka.adewale@gmail.com'
    },
    father: {
      name: 'Mr. Adewale Johnson',
      contactDetails: '+234 812 345 6789'
    },
    mother: {
      name: 'Mrs. Ngozi Adewale',
      contactDetails: '+234 802 456 7890'
    },
    guardian: {
      name: 'Mrs. Amaka Okafor',
      contactDetails: '+234 703 987 6543'
    },
    imageUrl: '/img/ade.png'
  }
}

export default function StudentProfile() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState('personal')
  const [studentData, setStudentData] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStudentData = async () => {
      setIsLoading(true)
      try {
        const data = await fetchStudentData(params.id as string)
        setStudentData(data)
      } catch (error) {
        console.error('Failed to fetch student data:', error)
        // Handle error state here
      } finally {
        setIsLoading(false)
      }
    }

    loadStudentData()
  }, [params.id])

  const renderTabContent = () => {
    if (!studentData) return null

    switch (activeTab) {
      case 'personal':
        return <PersonalInfo student={studentData} />
      case 'academic':
        return <AcademicInformation student={studentData} />
      case 'behavioral':
        return <BehavioralData student={studentData} />
      case 'performance':
        return <PerformanceAnalytics student={studentData} />
      case 'achievement':
        return <Achievement student={studentData} />
      default:
        return <PersonalInfo student={studentData} />
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!studentData) {
    return <div className="flex justify-center items-center h-screen">Student not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-[100%]">
      <div className="p-4 space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="primary" className="bg-[#002147] gap-2">
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Image
                src={studentData.imageUrl}
                alt={studentData.fullName}
                width={100}
                height={100}
                className="rounded-full"
              />
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#8F8F8F]">Name:</span>
                <span className='font-medium text-[#030E18]'>{studentData.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#8F8F8F]">Status:</span>
                <span className="text-green-500">{studentData.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#8F8F8F]">Class:</span>
                <span className='font-medium text-[#030E18]'>{studentData.class}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#002147] text-[#002147]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="mt-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

