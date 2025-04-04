import { Book, Award, Calendar } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import type { MetricCardProps } from "@/types/dashboard"
import Link from 'next/link'




export function MetricCard({ icon, value, label, link }: MetricCardProps) {

  return (
    <Card className="overflow-hidden bg-white shadow-none border-[#F0F0F0]">
      <CardContent className="p-6">
        <div className="space-y-2 flex mb-6 justify-start items-center gap-2 flex-row">
        <div className=" flex justify-center items-center text-blue-600">{icon}</div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <p className="text-sm text-[#878787]">{label}</p>
          </div>
        </div>
        {/* Horizontal lines */}
        <div className=" h-px -mx-6 bg-[#F0F0F0]" />
        <Link href={link}>
          <button className="mt-4 inline-flex items-center text-sm text-[#878787] hover:text-gray-900">
            See more
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </Link>
      </CardContent>
    </Card>
  )
}

