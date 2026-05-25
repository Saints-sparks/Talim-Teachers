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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    setResourceList(resources);
  }, [resources]);
  const getClassName = (classId: Resource["classId"]) => {
    if (!classId) return "Unassigned Class";

    if (typeof classId === "object") {
      if ("name" in classId && classId.name) return classId.name;
      const id = classId._id || (classId as any).id;
      const cls = classes.find((c) => c._id === id || c.id === id);
      return cls?.name || "Unassigned Class";
    }

    const cls = classes.find((c) => c._id === classId || c.id === classId);
    return cls?.name || "Unassigned Class";
  };

  const getCourseName = (courseId: Resource["courseId"]) => {
    if (!courseId) return "No course";
    if (typeof courseId === "object") {
      const title = "title" in courseId ? courseId.title : undefined;
      const code = "courseCode" in courseId ? courseId.courseCode : undefined;
      return [code, title].filter(Boolean).join(" - ") || "No course";
    }
    return "Course selected";
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
  const getResourceUrl = (resource: Resource) => {
    if (resource.files && resource.files.length > 0) return resource.files[0];
    if (resource.image) return resource.image;
    return "";
  };

  const handleView = (resource: Resource) => {
    const url = getResourceUrl(resource);
    if (!url) {
      window.alert("No file available for this resource.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleDelete = async (id: string) => {
    if (!getAccessToken()) {
      window.alert("Authentication required.");
      return;
    }

    const token = getAccessToken();

    if (!token) return;

    setLoading(id);
    const success = await deleteResource(id, token);
    if (success) {
      onResourceDelete(id);
    }
    setLoading(null);
  };

  const openDeleteConfirm = (resource: Resource) => {
    setPendingDelete(resource);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete?._id) return;
    await handleDelete(pendingDelete._id);
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  return (
    <div>
      <div className="bg-white rounded-lg hidden md:block">
        <Table className="text-[#030303] bg-white">
          <TableHeader className="text-[#030E18]">
            <TableRow>
              <TableHead className="flex gap-2 items-center">Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="flex justify-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resourceList.map((resource) => (
              <TableRow key={resource._id}>
                <TableCell>
                  <div className="flex items-center gap-2 p-5">
                    {/* {getFileIcon(resource.type)} */}{" "}
                    <span className="text-[#030303]">{resource.name}</span>
                  </div>
                </TableCell>
                <TableCell>{getClassName(resource.classId)}</TableCell>
                <TableCell>{getCourseName(resource.courseId)}</TableCell>
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
                      <DropdownMenuContent align="end" className="bg-white text-[#030E18] border border-[#D7E6F6] shadow-lg">
                        <DropdownMenuItem className="cursor-pointer text-[#030E18] focus:bg-[#EAF2FB] focus:text-[#030E18]" onClick={() => handleView(resource)}>
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-[#030E18] focus:bg-[#EAF2FB] focus:text-[#030E18]"
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
                    onClick={() => openDeleteConfirm(resource)}
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
        {resourceList.map((resource) => (
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
                <p className="text-[12px] text-black font-medium">Course</p>
                <p className="text-[14px] text-[#676767]">
                  {getCourseName(resource.courseId)}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <Info size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white text-[#030E18] border border-[#D7E6F6] shadow-lg">
                  <DropdownMenuItem className="cursor-pointer text-[#030E18] focus:bg-[#EAF2FB] focus:text-[#030E18]" onClick={() => handleView(resource)}>
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-[#030E18] focus:bg-[#EAF2FB] focus:text-[#030E18]"
                    onClick={() => {
                      setSelectedResource(resource);
                      setEditModalOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-red-500 hover:bg-red-100"
                onClick={() => openDeleteConfirm(resource)}
                disabled={loading === resource._id}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete resource?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-[#030E18]">
                {pendingDelete?.name || "this resource"}
              </span>
              . You can’t undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-[#F0F0F0] hover:bg-[#F0F0F0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-[#D92D20] hover:bg-[#B42318] text-white"
              disabled={loading === pendingDelete?._id}
            >
              {loading === pendingDelete?._id ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
