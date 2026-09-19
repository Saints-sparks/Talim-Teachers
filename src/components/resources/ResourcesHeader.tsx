import React from "react";
import { BookOpen, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Props for {@link ResourcesHeader}. */
export interface ResourcesHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  /** Whether the Upload button shows (the teacher may upload). */
  canUpload: boolean;
  onUpload: () => void;
}

/**
 * The title, the search box and the Upload button at the top of the resources
 * page.
 *
 * @param props - See {@link ResourcesHeaderProps}.
 * @param props.searchTerm - The search text.
 * @param props.onSearchChange - Called as the teacher types.
 * @param props.canUpload - Whether the Upload button shows.
 * @param props.onUpload - Opens the upload dialog.
 * @returns The header element.
 */
export function ResourcesHeader({ searchTerm, onSearchChange, canUpload, onUpload }: ResourcesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-4 sm:mb-6" data-guide="resources-header">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#003366] rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-[#030E18]">My Resources</h1>
          <p className="text-sm sm:text-base text-[#6F6F6F]">Share your lessons and educational materials</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center border border-[#F0F0F0] rounded-lg px-3 bg-white w-full">
          <Search className="text-[#878787]" size={18} />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1 ml-2 text-sm sm:text-base"
            placeholder="Search resources..."
            aria-label="Search resources"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {canUpload && (
          <Button
            onClick={onUpload}
            className="bg-[#003366] hover:bg-[#002244] text-white shadow-none transition-all duration-300 w-full sm:w-auto sm:self-start"
            data-guide="resources-upload-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="text-sm sm:text-base">Upload Resource</span>
          </Button>
        )}
      </div>
    </div>
  );
}
