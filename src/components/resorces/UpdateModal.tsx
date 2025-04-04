import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Folder } from "lucide-react";
import { updateResource } from "../../app/services/api.service"; // Assuming this is the service

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: any; // Existing resource data
  onResourceUpdate: (updatedResource: any) => void;
}

export function UpdateModal({ isOpen, onClose, resource, onResourceUpdate }: UpdateModalProps) {
  const { getAccessToken } = useAuth(); 
  const [name, setName] = useState(resource?.name || "");
  const [selectedClass, setSelectedClass] = useState(resource?.classId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resource) {
      setName(resource.name);
      setSelectedClass(resource.classId);
    }
  }, [resource]);

  const handleUpdate = async () => {
    if (!name || !selectedClass) {
      alert("Please fill all fields");
      return;
    }

    const updatedData = {
      name,
      classId: selectedClass,
      termId: resource.termId, // Use the existing termId
      uploadDate: resource.uploadDate, // Use the existing uploadDate
      image: resource.image, // Use the existing image
      files: resource.files, // Use the existing files
    };

    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        alert("Authentication token is missing.");
        return;
      }
      
      // Call the update API
      await updateResource(resource._id, updatedData, token);
      alert("Update successful!");
      onResourceUpdate(updatedData); // Callback to update the resource list
      onClose(); // Close modal
    } catch (error) {
      alert("Update failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Update Resource</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="resource-name">Resource Name</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="class">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue
                  placeholder="Select class"
                />
              </SelectTrigger>
              <SelectContent>
                {/* Assuming classes are passed down as a prop */}
                {resource?.classes.map((cls: any) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Non-editable Fields */}
          <div className="grid gap-2">
            <Label>Term</Label>
            <p>{resource.termId}</p>
          </div>
          <div className="grid gap-2">
            <Label>Upload Date</Label>
            <p>{new Date(resource.uploadDate).toLocaleDateString()}</p>
          </div>
          <div className="grid gap-2">
            <Label>Image</Label>
            <p>{resource.image}</p>
          </div>
          <div className="grid gap-2">
            <Label>Files</Label>
            <ul>
              {resource.files.map((file: string, index: number) => (
                <li key={index}>{file}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            className="bg-[#002147] text-white"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
