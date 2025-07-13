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
import {
  getAssignedClasses,
  getCurrentTerm,
  createResource,
} from "../../app/services/api.service";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Upload, FileText, X, CheckCircle2, Loader2, GraduationCap } from "lucide-react";
import { Resource } from "@/types/student";
import { useAppContext } from "@/app/context/AppContext";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewResourceUpload: (newResource: Resource) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onNewResourceUpload,
}: UploadModalProps) {
  const { user, classes, isLoading: contextLoading } = useAppContext(); // Get loading state from context
  const { getAccessToken } = useAuth();
  const [localClasses, setLocalClasses] = useState<any[]>([]); // Fallback local classes
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [termLoading, setTermLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);

  // Use classes from context, fallback to local classes
  const availableClasses = classes.length > 0 ? classes : localClasses;

  // Replace these with your actual Cloudinary details
  const CLOUD_NAME = "ddbs7m7nt";
  const UPLOAD_PRESET = "presetOne";

  useEffect(() => {
    if (!user) return;

    console.log("Upload modal - User:", user);
    console.log("Upload modal - Classes from context:", classes);
    console.log("Upload modal - Local classes:", localClasses);
    console.log("Upload modal - Context loading:", contextLoading);

    const fetchData = async () => {
      setTermLoading(true);
      const token = getAccessToken();
      if (!token) return;

      try {
        // Fetch current term
        const term = await getCurrentTerm(token);
        setCurrentTerm(term);
        console.log("Current term:", term);

        // If no classes from context and not loading, fetch them directly
        if (classes.length === 0 && !contextLoading && localClasses.length === 0) {
          console.log("Fetching classes directly for upload modal...");
          setClassesLoading(true);
          try {
            const teacherId = user?.teacherId || user?.userId;
            const classDetails = await getAssignedClasses(teacherId, token);
            console.log("Fetched classes directly:", classDetails);
            setLocalClasses(classDetails);
          } catch (error) {
            console.error("Error fetching classes directly:", error);
          } finally {
            setClassesLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching current term:", error);
      } finally {
        setTermLoading(false);
      }
    };

    fetchData();
  }, [user, getAccessToken, classes, contextLoading, localClasses.length]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setResourceName("");
      setSelectedClass(null);
      setSelectedFile(null);
      setUploadSuccess(false);
    }
  }, [isOpen]);

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
      const teacherId = user?.teacherId || user?.userId;
      const resourceData = {
        name: resourceName,
        classId: selectedClass,
        courseId: "669b0a0cdbc8b99b10dbdcf8", // You might want to make this dynamic based on selected class/course
        uploadedBy: teacherId, // Use teacher ID from context
        termId: currentTerm?._id,
        uploadDate: new Date().toISOString(),
        image: fileUrl, // Using Cloudinary file URL here
        files: [fileUrl],
      };

      console.log("Uploading resource with teacher ID:", teacherId);

      // Step 3. Upload the resource data to your backend
      const uploadedResource = await createResource(resourceData, token);

      setUploadSuccess(true);
      // Update the resource list in the parent component
      onNewResourceUpload(uploadedResource);

      // Close modal after 2 seconds to show success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] text-black p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  Upload Resource
                </DialogTitle>
                <p className="text-blue-100 text-sm">
                  Share educational materials with your students
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {uploadSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Successful!
              </h3>
              <p className="text-gray-600">
                Your resource has been uploaded and is now available to students.
              </p>
            </div>
          ) : (
            <>
              {/* Resource Name */}
              <div className="space-y-2">
                <Label htmlFor="resource-name" className="text-sm font-medium text-gray-700">
                  Resource Name
                </Label>
                <Input
                  id="resource-name"
                  placeholder="e.g., Mathematics Chapter 5 Notes"
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Class Selection */}
              <div className="space-y-2">
                <Label htmlFor="class" className="text-sm font-medium text-gray-700">
                  Class
                </Label>
                <Select onValueChange={setSelectedClass} disabled={contextLoading || termLoading || classesLoading || availableClasses.length === 0}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <SelectValue
                        placeholder={
                          contextLoading || termLoading || classesLoading
                            ? "Loading classes..." 
                            : availableClasses.length === 0 
                              ? "No classes available" 
                              : "Select a class"
                        }
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-black bg-white">
                    {availableClasses.length > 0 ? (
                      availableClasses.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{cls.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {availableClasses.length === 0 && !contextLoading && !termLoading && !classesLoading && (
                  <p className="text-xs text-orange-600">
                    No classes assigned. Please contact your administrator.
                  </p>
                )}
                {availableClasses.length > 0 && (
                  <p className="text-xs text-green-600">
                    {availableClasses.length} class{availableClasses.length !== 1 ? 'es' : ''} available
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Upload File
                </Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-3"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile ? selectedFile.name : "Choose a file"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, Images, Videos up to 10MB
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!uploadSuccess && (
          <div className="px-6 pb-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploading}
              className="border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedClass || !resourceName || !selectedFile}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resource
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
