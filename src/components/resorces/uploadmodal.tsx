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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Replace these with your actual Cloudinary details
  const CLOUD_NAME = "ddbs7m7nt";
  const UPLOAD_PRESET = "presetOne";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedClass || !resourceName || !selectedFile) {
      alert("Please fill all fields and select a file");
      return;
    }

    setUploading(true);
    const token = getAccessToken();
    if (!token) {
      alert("Authentication token is missing.");
      setUploading(false);
      return;
    }

    try {
      // Step 1. Upload the file to Cloudinary
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", UPLOAD_PRESET);

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        throw new Error("Cloudinary upload failed");
      }
      
      const cloudinaryData = await cloudinaryResponse.json();
      const fileUrl = cloudinaryData.secure_url;

      // Step 2. Prepare your resource object with the Cloudinary file URL
      const resourceData: Resource = {
        // _id can be assigned by your backend if needed
        name: resourceName,
        classId: selectedClass,
        termId: currentTerm?._id,
        uploadDate: new Date().toISOString(),
        image: fileUrl, // Using Cloudinary file URL here. Adjust if you need separate image/file fields.
        files: [fileUrl],
      };

      // Step 3. Upload the resource data to your backend
      await uploadResource(resourceData, token);

      alert("Upload successful!");
      // Update the resource list in the parent component
      onNewResourceUpload(resourceData);
      onClose(); // Close modal

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
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
              id="project-name"
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
            <Label>Upload File</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id="file-upload"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="custom-file-label flex flex-col items-center justify-center text-[#454545] font-[16px] cursor-pointer"
              >
                <Folder />
                {selectedFile ? selectedFile.name : "Upload file"}
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button className="bg-[#002147] text-white" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
