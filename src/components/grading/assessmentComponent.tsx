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

const mockAssessments = [
  {
    id: 1,
    name: "Mathematics",
    test: 30,
    exam: 70,
  },
  // you can add more subjects here
];

const AssessmentComponent: React.FC = () => {
  return (
    <div className="bg-white p-3 rounded-xl flex flex-col gap-4">
      <h1 className="text-[#373737] font-medium">Assessment Component</h1>

      {/* ——— Desktop Table ——— */}
      <div className="hidden md:block">
        <Table className="px-5 bg-white">
          <TableHeader className="text-[#6B6B6B]">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Examination</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAssessments.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="border py-1 px-2 rounded-md text-[#898989]">
                    {item.name}
                  </p>
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    defaultValue={item.test}
                    min={0}
                    max={100}
                    className={`
                      w-full border rounded px-2 py-1 appearance-auto
                      [&::-webkit-outer-spin-button]:block
                      [&::-webkit-inner-spin-button]:block
                      [&::-webkit-outer-spin-button]:opacity-100
                      [&::-webkit-inner-spin-button]:opacity-100
                    `}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    defaultValue={item.exam}
                    min={0}
                    max={100}
                    className={`
                      w-full border rounded px-2 py-1 appearance-auto
                      [&::-webkit-outer-spin-button]:block
                      [&::-webkit-inner-spin-button]:block
                      [&::-webkit-outer-spin-button]:opacity-100
                      [&::-webkit-inner-spin-button]:opacity-100
                    `}
                  />
                </TableCell>
                <TableCell className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border border-[#001466] w-full shadow-none bg-transparent hover:bg-gray-100"
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ——— Mobile Cards ——— */}
      <div className="flex flex-col gap-4 md:hidden">
        {mockAssessments.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl shadow-sm border"
          >
            <div className="space-y-1 mb-4">
              <p className="text-[14px]">Name</p>
              <p className="border py-1 px-2 rounded-md text-[#898989] mb-4">
                {item.name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Test</label>
              <input
                type="number"
                defaultValue={item.test}
                min={0}
                max={100}
                className="w-full border rounded px-2 py-1 appearance-auto"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Examination</label>
              <input
                type="number"
                defaultValue={item.exam}
                min={0}
                max={100}
                className="w-full border rounded px-2 py-1 appearance-auto"
              />
            </div>

            <Button
              variant="outline"
              className="w-full border border-[#001466] shadow-none bg-transparent hover:bg-gray-100"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentComponent;
