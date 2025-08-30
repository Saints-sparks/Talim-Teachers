"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Image,
  Video,
  AlignLeft,
  Download,
  MoreVertical,
  Trash2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { deleteResource } from "@/app/services/api.service";
import { Resource } from "@/types/student";
import { UpdateModal } from "./UpdateModal";

// const getFileIcon = (type: Resource["type"]) => {
//   switch (type) {
//     case "pdf":
//       return <FileText className="h-4 w-4" />;
//     case "img":
//       return <Image className="h-4 w-4" />;
//     case "vid":
//       return <Video className="h-4 w-4" />;
//     case "txt":
//       return <AlignLeft className="h-4 w-4" />;
//   }
// };

interface ResourcesTableProps {
  resources: Resource[];
  classes: any[];
  onResourceDelete: (resourceId: string) => void;
}

export function ResourcesTable({
  resources,
  classes,
  onResourceDelete,
}: ResourcesTableProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [resourceList, setResourceList] = useState(resources);

  const [loading, setLoading] = useState<string | null>(null);
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c._id === classId);
    return cls ? cls.name : "Unknown Class";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };
  const { getAccessToken } = useAuth(); // Get logged-in teacher's info
  const handleDelete = async (id: string) => {
    if (!getAccessToken()) {
      alert("Authentication required.");
      return;
    }
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this resource?"
    );
    if (!confirmDelete) return;

    const token = getAccessToken();

    if (!token) return;

    setLoading(id);
    const success = await deleteResource(id, token);
    if (success) {
      onResourceDelete(id);
    }
    setLoading(null);
  };

  return (
    <div>
      <div className="bg-white rounded-lg hidden md:block">
        <Table className="text-[#030303] bg-white ">
          <TableHeader className="text-[#030E18]">
            <TableRow>
              <TableHead className="flex gap-2 items-center">Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="flex justify-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource._id}>
                <TableCell>
                  <div className="flex items-center gap-2 p-5">
                    {/* {getFileIcon(resource.type)} */}{" "}
                    <span className="text-[#030303]">{resource.name}</span>
                  </div>
                </TableCell>
                <TableCell>{getClassName(resource.classId)}</TableCell>
                <TableCell className="text-[#616161]">
                  {formatDate(resource.uploadDate)}
                </TableCell>
                <TableCell className="flex justify-center items-center">
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedResource(resource);
                            setEditModalOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-none shadow-none"
                    onClick={() => resource._id && handleDelete(resource._id)}
                    disabled={loading === resource._id}
                  >
                    <Trash2 className="text-[#D92D20]" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Mobile View - Cards */}

        {selectedResource && (
          <UpdateModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            resource={{ ...selectedResource, classes }}
            onResourceUpdate={(updated) => {
              // Update UI state
              const updatedList = resourceList.map((res) =>
                res._id === selectedResource._id ? { ...res, ...updated } : res
              );
              setResourceList(updatedList);
              setEditModalOpen(false);
            }}
          />
        )}
      </div>
      <div className="block md:hidden space-y-4 mt-4">
        {resources.map((resource) => (
          <div key={resource._id} className="rounded-lg bg-white p-4 ">
            <p className="text-[12px] text-black font-medium mb-1">Name</p>
            <p className="text-[14px] text-[#676767]">{resource.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[12px] text-black font-medium">Class</p>
                <p className="text-[14px] text-[#676767]">
                  {getClassName(resource.classId)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-black font-medium">
                  Upload Date
                </p>
                <p className="text-[14px] text-[#676767]">
                  {formatDate(resource.uploadDate)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => {
                  setSelectedResource(resource);
                  setEditModalOpen(true);
                }}
              >
                <Info size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-red-500 hover:bg-red-100"
                onClick={() => resource._id && handleDelete(resource._id)}
                disabled={loading === resource._id}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
