import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RowNumber() {
  return (
    <div className="flex items-center justify-between mx-5 rounded-lg mb-2 px-4 py-4 border border-[#F0F0F0] bg-white">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <Select defaultValue="3">
          <SelectTrigger className="w-16 border-none shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="9">9</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">Showing 1 - 9 of 18</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
        <Select defaultValue="1">
          <SelectTrigger className="w-16 rounded-lg border border-[#F0F0F0] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        <span className="text-sm text-muted-foreground">of page 2</span>
        </Select>
          <Button
            variant="outline"
            className="border-none shadow-none "
            size="icon"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="border-none shadow-none"
            size="icon"
          >
            <ChevronRight className="" />
          </Button>
        </div>
      </div>
    </div>
  );
}
