import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Info, Trash2 } from "lucide-react";

const AssessmentComponent = () => {
  return (
    <div className="bg-white p-3 rounded-xl flex flex-col">
      <h1 className="text-[#373737] font-medium ">Assessment Component</h1>
      <div className="py-2">
        <Table className=" px-5 bg-white">
          <TableHeader className="text-[#6B6B6B]">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="flex justify-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>hi</TableCell>
              <TableCell className="text-[#616161]">hey</TableCell>
              <TableCell className="flex justify-center">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-none shadow-none"
                >
                  <Trash2 className="text-[#D92D20]" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AssessmentComponent;
