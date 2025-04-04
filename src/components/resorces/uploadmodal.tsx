import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAssignedClasses, getCurrentTerm, uploadResource } from "../../app/services/api.service";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Folder } from "lucide-react";
import { Resource } from "@/types/student";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewResourceUpload: (newResource: Resource) => void;
}

export function UploadModal({ isOpen, onClose, onNewResourceUpload }: UploadModalProps) {
  const { getUser, getAccessToken } = useAuth(); // Get logged-in teacher's info
  const [classes, setClasses] = useState<any[]>([]); // Store classes here
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // Store user information locally
  const [resourceName, setResourceName] = useState("");
  const [currentTerm, setCurrentTerm] = useState<any>(null);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const token = getAccessToken();
      if (!token) return;

      try {
        const classDetails = await getAssignedClasses(user.userId, token);
        setClasses(classDetails);

        const term = await getCurrentTerm(token);
        setCurrentTerm(term);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleUpload = async () => {
    if (!selectedClass  || !resourceName) {
      alert("Please fill all fields");
      return;
    }
  
    const resourceData = {
      // _id: crypto.randomUUID(), // Generate a temporary unique ID
      name: resourceName,
      classId: selectedClass,
      termId: currentTerm._id, 
      uploadDate: new Date().toISOString(),
      image: "https://dummyurl.com/image.jpg", // Dummy image URL
      files: ["https://dummyurl.com/file1.pdf"], // Dummy file URLs
    };
  
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Authentication token is missing.");
        return;
      }
      await uploadResource(resourceData, token);
      alert("Upload successful!");
       // Call the callback to update the resource list in parent component
       onNewResourceUpload(resourceData);
      onClose(); // Close modal
    } catch (error) {
      alert("Upload failed. Check console for details.");
    }
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Resources</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Resource Name</Label>
            <Input
              id="project-name shadow-none"
              placeholder="History note book"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="class">Class</Label>
            <Select onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? "Loading..." : "Select class"}
                />
              </SelectTrigger>
              <SelectContent className="text-black bg-white">
                {classes.map((cls) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Upload file</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id="file-upload"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="custom-file-label flex flex-col items-center justify-center text-[#454545] font-[16px] cursor-pointer"
              >
                <Folder />
                Upload file
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button className="bg-[#002147] text-white" onClick={handleUpload}>
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
