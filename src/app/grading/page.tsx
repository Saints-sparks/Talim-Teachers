"use client";
import AssessmentComponent from "@/components/grading/assessmentComponent";
import GradingPanel from "@/components/grading/gradingPanel";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";

const GradingPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-4 h-full flex flex-col gap-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#2F2F2F] font-medium">Grading System</h1>
            <p className="text-[#AAAAAA]">
              Grade and upload student results effortlessly
            </p>
          </div>
          <div className="flex  h-10 sm:h-12 border border-[#F0F0F0] bg-white items-center p-2 rounded-lg text-[#898989]">
            <Search strokeWidth="1.5" />
            <Input
              type="search"
              placeholder="Search for students"
              className="flex-1 border-none shadow-none focus:outline-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-1">
            {" "}
            <p>Course Code:</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex text-[#898989] bg-[#FFFFFF] rounded-lg shadow-none border-[#F0F0F0] items-center gap-1"
                >
                  Mth103 <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="font-manrope" align="end">
                <DropdownMenuItem>Mth111</DropdownMenuItem>
                <DropdownMenuItem>Mth112</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <AssessmentComponent />
          <GradingPanel />
        </div>
      </div>
    </Layout>
  );
};
export default GradingPage;
