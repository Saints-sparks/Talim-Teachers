"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "../ui/button";

const mockData = [
  {
    id: 1,
    name: "Michael Lawson",
    test: 30,
    exam: 70,
    total: 100,
    feedback: "Excellent work on the case study!",
    status: "Graded",
  },
  {
    id: 2,
    name: "Sarah Connor",
    test: 25,
    exam: 65,
    total: 90,
    feedback: "Good effort, but needs more detail.",
    status: "Pending",
  },
  // …add more rows as needed
];

const GradingPanel = () => {
  return (
    <div className="bg-white p-3 rounded-xl flex flex-col gap-4">
      {/* Header + Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-[#373737] font-medium p-1 sm:p-0">
          Grading Panel: Midterm Examination
        </h1>
        <div className="flex gap-2 hidden sm:flex">
          <Button className="shadow-none border border-[#001466]">
            Export Grades
          </Button>
          <Button className="shadow-none bg-[#001466] text-white">
            Send Grades
          </Button>
        </div>
      </div>

      {/* ————————— Desktop Table ————————— */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="text-[#6B6B6B]">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Test (30%)</TableHead>
              <TableHead>Exam (70%)</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p>{row.name}</p>
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    className={`
                      w-full border rounded px-2 py-1 appearance-auto
                      [&::-webkit-outer-spin-button]:block
                      [&::-webkit-inner-spin-button]:block
                      [&::-webkit-outer-spin-button]:opacity-100
                      [&::-webkit-inner-spin-button]:opacity-100
                    `}
                    defaultValue={row.test}
                    min={0}
                    max={100}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    className={`
                      w-full border rounded px-2 py-1 appearance-auto
                      [&::-webkit-outer-spin-button]:block
                      [&::-webkit-inner-spin-button]:block
                      [&::-webkit-outer-spin-button]:opacity-100
                      [&::-webkit-inner-spin-button]:opacity-100
                    `}
                    defaultValue={row.exam}
                    min={0}
                    max={100}
                  />
                </TableCell>
                <TableCell>
                  <p className="text-[#898989]">{row.total}</p>
                </TableCell>
                <TableCell>
                  <p className="px-2 py-2 border rounded-md text-[#898989]">
                    {row.feedback}
                  </p>
                </TableCell>
                <TableCell className="flex justify-center">
                  <Button
                    size="sm"
                    className="w-full shadow-none bg-[#EFEFEF] text-[#4D4D4D] hover:bg-gray-100"

                  >
                    {row.status}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ————————— Mobile Cards ————————— */}
      <div className="flex flex-col gap-4 md:hidden">
        {mockData.map((row) => (
          <div key={row.id} className="bg-white p-4 rounded-xl border">
            <p className="font-medium text-[#373737] mb-3">{row.name}</p>

            <div className="mb-3">
              <label className="block text-sm mb-1">Test (30%)</label>
              <input
                type="number"
                defaultValue={row.test}
                min={0}
                max={100}
                className="w-full border rounded px-2 py-1 appearance-auto"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Exam (70%)</label>
              <input
                type="number"
                defaultValue={row.exam}
                min={0}
                max={100}
                className="w-full border rounded px-2 py-1 appearance-auto"
              />
            </div>

            <div className="mb-3">
              <span className="text-sm text-[#616161]">Total</span>
              <p className="mt-1 text-[#898989]">{row.total}</p>
            </div>

            <div className="mb-4">
              <span className="text-sm text-[#616161]">Feedback</span>
              <p className="mt-1 px-2 py-2 border rounded-md text-[#898989] text-[14px]">
                {row.feedback}
              </p>
            </div>

            <Button
              className="w-full shadow-none bg-[#EFEFEF] text-[#4D4D4D] hover:bg-gray-100"
              size="sm"
            >
              {row.status}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradingPanel;
