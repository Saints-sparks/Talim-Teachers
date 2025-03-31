"use client";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesTable } from "@/components/resorces/ResourceTable";
import { UploadModal } from "@/components/resorces/uploadmodal";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/HeaderTwo";
import RowNumber from "@/components/RowNumber";
import Layout from "@/components/Layout";

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
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center p-4">
          <div>
            <h1 className="text-xl font-medium mb-1 text-[#2F2F2F]">Resources</h1>
            <p className="text-[#AAAAAA]">Share Your Lessons and Resources</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center border border-[#F0F0F0] shadow-none rounded-lg px-3  bg-white">
                    <Search className="text-[#898989]" size={18} />
                    <Input
                      className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1"
                      placeholder="Search"
                    />
                  </div>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-[#001466] hover:bg-[#003366] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
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
    </Layout>
  );
}
