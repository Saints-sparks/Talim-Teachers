"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResourcesTable } from "@/components/resorces/ResourceTable";
import { UploadModal } from "@/components/resorces/uploadmodal";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";

const resources = [
  {
    id: "1",
    name: "History Video.pdf",
    subject: "History",
    uploadDate: "October 10, 2024",
    type: "pdf" as const,
  },
  {
    id: "2",
    name: "History Video.img",
    subject: "History",
    uploadDate: "October 10, 2024",
    type: "img" as const,
  },
  {
    id: "3",
    name: "History Video.txt",
    subject: "History",
    uploadDate: "October 10, 2024",
    type: "txt" as const,
  },
];

export default function ResourcePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const filteredResources = resources.filter(
    (resource) =>
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className=" space-y-6 ">
      <Header />

      <div className="flex justify-between items-center px-9 ">
        <div>
          <h1 className="text-2xl font-semibold mb-1 text-gray-500">Resources</h1>
          <p className="text-gray-500">Share Your Lessons and Resources</p>
        </div>
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-[#002147] hover:bg-[#003366] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      <div className="px-10 ">
        <ResourcesTable resources={filteredResources} />
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      <div>
        <RowNumber />
      </div>
    </div>
  );
}
