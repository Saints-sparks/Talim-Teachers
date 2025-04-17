"use client";

import { useState, useEffect, use } from "react";
import { Upload } from "lucide-react";
import Button from "@/components/Button";
import { GradingTable } from "@/components/grading/grading-table";
import { GradingModal } from "@/components/grading/grading-modal";

interface Subject {
  name: string;
  testScore: number;
  examScore: number;
  totalScore: number;
}

export default function GradingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params); // Resolve params
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isClient, setIsClient] = useState(false); // Track client rendering

  useEffect(() => {
    setIsClient(true); // Ensure this runs only on the client
  }, []);

  useEffect(() => {
    // Only proceed if running in the client and id is resolved
    if (isClient && id) {
      const savedScores = localStorage.getItem(`gradingScores_${id}`);
      if (savedScores) {
        const scores = JSON.parse(savedScores);
        const tableSubjects = scores.slice(1).map((score: any) => ({
          name: score.subject,
          testScore: score.test,
          examScore: score.exam,
          totalScore: score.test + score.exam,
        }));
        setSubjects(tableSubjects);
      }
    }
  }, [id, isClient]);

  const handleGradeSubmit = (
    scores: { subject: string; test: number; exam: number }[]
  ) => {
    const newSubjects = scores.slice(1).map((score) => ({
      name: score.subject,
      testScore: score.test,
      examScore: score.exam,
      totalScore: score.test + score.exam,
    }));
    setSubjects(newSubjects);
    localStorage.setItem(`gradingScores_${id}`, JSON.stringify(scores));
    setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Grading System</h1>
          <p className="text-gray-500">
            Grade and upload student results effortlessly.
          </p>
        </div>
        <Button className="bg-[#002147]">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>
      {isClient && <GradingTable subjects={subjects} />}{" "}
      {/* Ensure rendering only in client */}
      <GradingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleGradeSubmit}
      />
    </div>
  );
}
