"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/Button";

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scores: { subject: string; test: number; exam: number }[]) => void;
}

export function GradingModal({ isOpen, onClose, onSubmit }: GradingModalProps) {
  const [scores, setScores] = useState([
    { subject: "Test", test: 21, exam: 100 },
    { subject: "English Language", test: 21, exam: 61 },
    { subject: "Mathematics", test: 21, exam: 61 },
  ]);

  const handleScoreChange = (
    index: number,
    type: "test" | "exam",
    value: number
  ) => {
    const newScores = [...scores];
    newScores[index][type] = value;
    setScores(newScores);
  };

  const handleIncrement = (index: number, type: "test" | "exam") => {
    const newScores = [...scores];
    newScores[index][type] += 1;
    setScores(newScores);
  };

  const handleDecrement = (index: number, type: "test" | "exam") => {
    const newScores = [...scores];
    newScores[index][type] -= 1;
    setScores(newScores);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md text-black">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Grading</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {scores.map((score, index) => (
            <div key={score.subject}>
              <label className="block text-sm mb-1">{score.subject}</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center border rounded">
                  <input
                    type="number"
                    className="w-full p-2"
                    value={score.test}
                    onChange={(e) =>
                      handleScoreChange(index, "test", parseInt(e.target.value))
                    }
                  />
                  <div className="border-l flex flex-col">
                    <button
                      className="px-2 py-1 hover:bg-gray-100"
                      onClick={() => handleIncrement(index, "test")}
                    >
                      ▲
                    </button>
                    <button
                      className="px-2 py-1 hover:bg-gray-100 border-t"
                      onClick={() => handleDecrement(index, "test")}
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <div className="flex items-center border rounded">
                  <input
                    type="number"
                    className="w-full p-2"
                    value={score.exam}
                    onChange={(e) =>
                      handleScoreChange(index, "exam", parseInt(e.target.value))
                    }
                  />
                  <div className="border-l flex flex-col">
                    <button
                      className="px-2 py-1 hover:bg-gray-100"
                      onClick={() => handleIncrement(index, "exam")}
                    >
                      ▲
                    </button>
                    <button
                      className="px-2 py-1 hover:bg-gray-100 border-t"
                      onClick={() => handleDecrement(index, "exam")}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button className="bg-[#002147]" onClick={() => onSubmit(scores)}>
            Grade
          </Button>
        </div>
      </div>
    </div>
  );
}
