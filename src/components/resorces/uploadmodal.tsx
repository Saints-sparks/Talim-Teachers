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
  getTeacherCourses,
} from "../../app/services/api.service";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  GraduationCap,
} from "lucide-react";
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
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [termLoading, setTermLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [termFetched, setTermFetched] = useState(false); // Track if term has been fetched
  const [coursesFetched, setCoursesFetched] = useState(false); // Track if courses have been fetched

  // Use classes from context, fallback to local classes
  const availableClasses = classes.length > 0 ? classes : localClasses;

  // Replace these with your actual Cloudinary details
  const CLOUD_NAME = "ddbs7m7nt";
  const UPLOAD_PRESET = "presetOne";

  useEffect(() => {
    if (!user || !isOpen) return;

    // Only log once when modal opens
    console.log("Upload modal opened - User:", user?.userId);

    const fetchData = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        // Fetch current term only once per modal session
        if (!currentTerm && !termFetched) {
          setTermLoading(true);
          const term = await getCurrentTerm(token);
          setCurrentTerm(term);
          setTermFetched(true);
          console.log("Fetched current term:", term?.name);
          setTermLoading(false);
        }

        // If no classes from context and not loading, fetch them directly
        if (
          classes.length === 0 &&
          !contextLoading &&
          localClasses.length === 0
        ) {
          console.log("Fetching classes for upload modal...");
          setClassesLoading(true);
          try {
            const teacherId = user?.teacherId || user?.userId;
            const classDetails = await getAssignedClasses(teacherId, token);
            console.log("Fetched classes count:", classDetails?.length || 0);
            setLocalClasses(classDetails);
          } catch (error) {
            console.error("Error fetching classes:", error);
          } finally {
            setClassesLoading(false);
          }
        }

        // Fetch teacher courses only once per modal session
        if (!coursesFetched && courses.length === 0) {
          console.log("Fetching courses for upload modal...");
          setCoursesLoading(true);
          try {
            const teacherId = user?.teacherId || user?.userId;
            const teacherCourses = await getTeacherCourses(teacherId, token);
            console.log("Fetched courses count:", teacherCourses?.length || 0);
            setCourses(teacherCourses);
            setCoursesFetched(true);
          } catch (error) {
            console.error("Error fetching courses:", error);
          } finally {
            setCoursesLoading(false);
          }
        }
      } catch (error) {
        console.error("Error in upload modal fetchData:", error);
        setTermLoading(false);
      }
    };

    fetchData();
  }, [user?.userId, isOpen]); // Simplified dependencies

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setResourceName("");
      setSelectedClass(null);
      setSelectedCourse(null);
      setSelectedFile(null);
      setUploadSuccess(false);
      setTermFetched(false); // Reset term fetched flag when modal closes
      setCoursesFetched(false); // Reset courses fetched flag when modal closes
      setCurrentTerm(null); // Reset current term when modal closes
      setCourses([]); // Reset courses when modal closes
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
        courseId: selectedCourse, // Use selected course instead of hardcoded value
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
      <DialogContent className="sm:max-w-[500px] text-black p-0 overflow-hidden shadow-none border border-[#F0F0F0]">
        {/* Header */}
        <div className="bg-[#003366] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  Upload Resource
                </DialogTitle>
                <p className="text-white/80 text-sm">
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
              <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#003366]" />
              </div>
              <h3 className="text-lg font-semibold text-[#030E18] mb-2">
                Upload Successful!
              </h3>
              <p className="text-[#6F6F6F]">
                Your resource has been uploaded and is now available to
                students.
              </p>
            </div>
          ) : (
            <>
              {/* Resource Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="resource-name"
                  className="text-sm font-medium text-[#030E18]"
                >
                  Resource Name
                </Label>
                <Input
                  id="resource-name"
                  placeholder="e.g., Mathematics Chapter 5 Notes"
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  className="border-[#F0F0F0] focus:border-[#003366] focus:ring-[#003366] shadow-none"
                />
              </div>

              {/* Class Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="class"
                  className="text-sm font-medium text-[#030E18]"
                >
                  Class
                </Label>
                <Select
                  onValueChange={setSelectedClass}
                  disabled={
                    contextLoading ||
                    termLoading ||
                    classesLoading ||
                    availableClasses.length === 0
                  }
                >
                  <SelectTrigger className="border-[#F0F0F0] focus:border-[#003366] focus:ring-[#003366] shadow-none">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-[#878787]" />
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
                  <SelectContent className="text-[#030E18] bg-white border-[#F0F0F0] shadow-none">
                    {availableClasses.length > 0 ? (
                      availableClasses.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-[#003366] rounded-full"></div>
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
                {availableClasses.length === 0 &&
                  !contextLoading &&
                  !termLoading &&
                  !classesLoading && (
                    <p className="text-xs text-[#878787]">
                      No classes assigned. Please contact your administrator.
                    </p>
                  )}
                {availableClasses.length > 0 && (
                  <p className="text-xs text-[#6F6F6F]">
                    {availableClasses.length} class
                    {availableClasses.length !== 1 ? "es" : ""} available
                  </p>
                )}
              </div>

              {/* Course Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="course"
                  className="text-sm font-medium text-[#030E18]"
                >
                  Course
                </Label>
                <Select
                  onValueChange={setSelectedCourse}
                  disabled={coursesLoading || courses.length === 0}
                >
                  <SelectTrigger className="border-[#F0F0F0] focus:border-[#003366] focus:ring-[#003366] shadow-none">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#878787]" />
                      <SelectValue
                        placeholder={
                          coursesLoading
                            ? "Loading courses..."
                            : courses.length === 0
                            ? "No courses available"
                            : "Select a course"
                        }
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-[#030E18] bg-white border-[#F0F0F0] shadow-none">
                    {courses.length > 0 ? (
                      courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-[#003366] rounded-full"></div>
                            <span>
                              {course.courseCode} - {course.title}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-courses" disabled>
                        No courses found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {courses.length === 0 && !coursesLoading && (
                  <p className="text-xs text-[#878787]">
                    No courses assigned. Please contact your administrator.
                  </p>
                )}
                {courses.length > 0 && (
                  <p className="text-xs text-[#6F6F6F]">
                    {courses.length} course{courses.length !== 1 ? "s" : ""}{" "}
                    available
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#030E18]">
                  Upload File
                </Label>
                <div className="border-2 border-dashed border-[#F0F0F0] rounded-lg p-6 text-center hover:border-[#003366] transition-colors">
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
                    <div className="w-12 h-12 bg-[#F0F0F0] rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#003366]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#030E18]">
                        {selectedFile ? selectedFile.name : "Choose a file"}
                      </p>
                      <p className="text-xs text-[#878787] mt-1">
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
              className="border-[#F0F0F0] hover:bg-[#F0F0F0] text-[#030E18] shadow-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                uploading ||
                !selectedClass ||
                !selectedCourse ||
                !resourceName ||
                !selectedFile
              }
              className="bg-[#003366] hover:bg-[#002244] text-white shadow-none transition-all duration-300"
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
