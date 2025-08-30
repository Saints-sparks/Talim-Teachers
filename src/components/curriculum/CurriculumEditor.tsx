"use client";
import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Save,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  Palette,
  Highlighter,
  Table as TableIcon,
  ImageIcon,
  Link as LinkIcon,
  Plus,
  Minus,
  Upload,
  Trash,
  BookOpen,
  GraduationCap,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCurriculum } from "../../app/hooks/useCurriculum";
import { useAuth } from "../../app/hooks/useAuth";

interface CurriculumEditorProps {
  onClose?: () => void;
  initialCourseId?: string | null;
  courseInfo?: any;
  editingCurriculumId?: string | null;
  editingCurriculumData?: any;
  teacherCourses?: any[];
  currentTerm?: any;
}

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({
  onClose,
  initialCourseId,
  courseInfo,
  editingCurriculumId,
  editingCurriculumData,
  teacherCourses = [],
  currentTerm = null,
}) => {
  const { getAccessToken } = useAuth();
  const { addCurriculum, editCurriculum, fetchCurriculumById, isLoading } =
    useCurriculum();

  const [courseId, setCourseId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedFont, setSelectedFont] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(14);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] =
    useState<boolean>(false);
  const [fileUploading, setFileUploading] = useState<boolean>(false);

  const fonts = [
    "Arial",
    "Times New Roman",
    "Calibri",
    "Georgia",
    "Verdana",
    "Comic Sans MS",
    "Impact",
    "Trebuchet MS",
    "Courier New",
  ];

  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#008000",
  ];

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: "<p>Enter curriculum content here...</p>",
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Initialize with passed props
  useEffect(() => {
    if (initialCourseId) {
      setCourseId(initialCourseId);
    }

    // Set term ID from currentTerm prop
    if (currentTerm?._id) {
      setTermId(currentTerm._id);
    }
  }, [initialCourseId, currentTerm]);

  // Load existing curriculum for editing
  useEffect(() => {
    const loadCurriculumForEdit = async () => {
      if (editingCurriculumData) {
        // Use the passed curriculum data directly
        setCourseId(
          editingCurriculumData.course._id || editingCurriculumData.course
        );
        setTermId(editingCurriculumData.term._id || editingCurriculumData.term);
        setContent(editingCurriculumData.content || "");
        setAttachments(editingCurriculumData.attachments || []);
        if (editor) {
          editor.commands.setContent(editingCurriculumData.content || "");
        }
      } else if (editingCurriculumId) {
        // Fallback to fetching by ID
        try {
          const curriculum = await fetchCurriculumById(editingCurriculumId);
          if (curriculum) {
            // Handle the new API response structure
            setCourseId(curriculum.course._id || curriculum.course);
            setTermId(curriculum.term._id || curriculum.term);
            setContent(curriculum.content || "");
            setAttachments(curriculum.attachments || []);
            if (editor) {
              editor.commands.setContent(curriculum.content || "");
            }
          }
        } catch (error) {
          console.error("Failed to load curriculum for editing:", error);
          toast.error("Failed to load curriculum for editing");
        }
      }
    };

    loadCurriculumForEdit();
  }, [editingCurriculumId, editingCurriculumData, editor]);

  const applyFont = (font: string) => {
    setSelectedFont(font);
    editor?.chain().focus().setFontFamily(font).run();
  };

  const applyFontSize = (size: number) => {
    setFontSize(size);
    editor?.commands.setFontSize(`${size}px`);
  };

  const applyColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  const applyHighlight = (color: string) => {
    editor?.chain().focus().toggleHighlight({ color }).run();
    setShowHighlightPicker(false);
  };

  const insertTable = () => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const addImageFromUrl = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const toggleLink = () => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const uploadFilesToCloudinary = async (files: FileList) => {
    setFileUploading(true);
    const token = getAccessToken();
    if (!token) {
      toast.error("No authentication token found");
      setFileUploading(false);
      return;
    }

    const uploadedUrls: string[] = [];
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset || "");

        const response = await fetch(cloudinaryUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      setAttachments((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setFileUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((item) => item !== url));
    toast.success("Attachment removed");
  };

  const handleSave = async () => {
    console.log(
      "Attempting to save with - Term ID:",
      termId,
      "Course ID:",
      courseId,
      "Attachments:",
      attachments
    );

    if (!courseId) {
      toast.error("Please select a course");
      return;
    }

    if (!termId) {
      toast.error("Term information is not loaded yet");
      return;
    }

    if (!content || content === "<p>Enter curriculum content here...</p>") {
      toast.error("Please enter curriculum content");
      return;
    }

    const userData = localStorage.getItem("user");
    if (!userData) {
      toast.error("User not authenticated");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (!user?.userId) {
        toast.error("Teacher ID not available");
        return;
      }

      const curriculumData = {
        course: courseId,
        term: termId,
        content,
        teacherId: user.userId,
        attachments,
      };

      console.log("Curriculum data:", curriculumData);

      if (editingCurriculumId) {
        // Update existing curriculum
        await editCurriculum(editingCurriculumId, curriculumData);
        toast.success("Curriculum updated successfully");
      } else {
        // Create new curriculum
        await addCurriculum(curriculumData);
        toast.success("Curriculum created successfully");
      }

      // Clear form
      editor?.commands.clearContent();
      setContent("");
      if (!initialCourseId) {
        setCourseId("");
      }
      setAttachments([]);

      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error("Error saving curriculum:", error);
      toast.error(error.message || "Failed to save curriculum");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!editor) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading editor...
      </div>
    );
  }

  const selectedCourse = teacherCourses.find(
    (course) => course._id === courseId
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        <div className="bg-white rounded-xl shadow-none border border-[#F0F0F0] overflow-hidden">
          {/* Talim Header */}
          <div className="bg-[#003366] p-4 md:p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold">
                    {editingCurriculumId
                      ? "Edit Curriculum"
                      : "Create New Curriculum"}
                  </h1>
                  <p className="text-white/90 mt-1 text-sm md:text-base">
                    {selectedCourse
                      ? `${selectedCourse.title || selectedCourse.name} - ${
                          selectedCourse.courseCode || selectedCourse.code
                        }`
                      : "Design your course curriculum"}
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close Editor"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile/Tablet Configuration Cards - Top */}
          <div className="lg:hidden bg-[#F8F8F8] border-b border-[#F0F0F0] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Course Selection Card */}
              {!initialCourseId ? (
                <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#003366]/10 rounded-lg">
                      <BookOpen className="w-4 h-4 text-[#003366]" />
                    </div>
                    <h3 className="font-semibold text-[#030E18] text-sm">
                      Course Selection
                    </h3>
                  </div>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#F0F0F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                    required
                    disabled={teacherCourses.length === 0}
                  >
                    <option value="">
                      {teacherCourses.length === 0
                        ? "Loading courses..."
                        : "Select a course/subject"}
                    </option>
                    {teacherCourses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title || course.name} (
                        {course.courseCode || course.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] flex items-center gap-3 mb-3">
                  <div className="p-2 bg-[#003366]/10 rounded-lg">
                    <BookOpen className="w-4 h-4 text-[#003366]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#878787] text-xs font-medium">
                      Course Description
                    </span>
                    <span className="font-semibold text-[#030E18] text-sm">
                      {selectedCourse.description}
                    </span>
                  </div>
                </div>
              )}

              {/* Term Information Card */}
              <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-[#003366]/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-[#003366]" />
                  </div>
                  <h3 className="font-semibold text-[#030E18] text-sm">
                    Term Information
                  </h3>
                </div>

                {currentTerm ? (
                  <div className="flex items-center gap-2 p-2 bg-[#003366]/5 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-[#003366]" />
                    <div>
                      <p className="text-xs font-medium text-[#030E18]">
                        Current Term
                      </p>
                      <p className="text-xs text-[#6F6F6F]">
                        {currentTerm.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-700">
                      Term information not available
                    </span>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] sm:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#003366]/10 rounded-lg">
                    <Clock className="w-4 h-4 text-[#003366]" />
                  </div>
                  <h3 className="font-semibold text-[#030E18] text-sm">
                    Status
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6F6F6F]">Course</span>
                    {courseId ? (
                      <CheckCircle className="w-4 h-4 text-[#003366]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6F6F6F]">Term</span>
                    {termId ? (
                      <CheckCircle className="w-4 h-4 text-[#003366]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6F6F6F]">Content</span>
                    {content &&
                    content !== "<p>Enter curriculum content here...</p>" ? (
                      <CheckCircle className="w-4 h-4 text-[#003366]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Desktop Sidebar - Course Configuration */}
            <div className="hidden lg:block w-80 bg-[#F8F8F8] border-r border-[#F0F0F0] p-6 space-y-6">
              <div className="space-y-4">
                {/* Course Selection Card */}
                {!initialCourseId ? (
                  <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-[#003366]/10 rounded-lg">
                        <BookOpen className="w-5 h-5 text-[#003366]" />
                      </div>
                      <h3 className="font-semibold text-[#030E18]">
                        Course Selection
                      </h3>
                    </div>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-4 py-3 border border-[#F0F0F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
                      required
                      disabled={teacherCourses.length === 0}
                    >
                      <option value="">
                        {teacherCourses.length === 0
                          ? "Loading courses..."
                          : "Select a course/subject"}
                      </option>
                      {teacherCourses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title || course.name} (
                          {course.courseCode || course.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0] flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#003366]/10 rounded-lg">
                      <BookOpen className="w-5 h-5 text-[#003366]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#878787] text-xs font-medium">
                        Course Description
                      </span>
                      <span className="font-semibold text-[#030E18]">
                        {selectedCourse.description}
                      </span>
                    </div>
                  </div>
                )}

                {/* Term Information Card */}
                <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#003366]/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-[#003366]" />
                    </div>
                    <h3 className="font-semibold text-[#030E18]">
                      Term Information
                    </h3>
                  </div>

                  {currentTerm ? (
                    <div className="flex items-center gap-3 p-3 bg-[#003366]/5 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-[#003366]" />
                      <div>
                        <p className="text-sm font-medium text-[#030E18]">
                          Current Term
                        </p>
                        <p className="text-xs text-[#6F6F6F]">
                          {currentTerm.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-700">
                          Term information not available
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Attachments Card */}
                <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#003366]/10 rounded-lg">
                      <Upload className="w-5 h-5 text-[#003366]" />
                    </div>
                    <h3 className="font-semibold text-[#030E18]">
                      Attachments
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        e.target.files &&
                        uploadFilesToCloudinary(e.target.files)
                      }
                      className="hidden"
                      id="file-upload"
                      accept="image/*,application/pdf"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-[#F0F0F0] rounded-lg cursor-pointer hover:border-[#003366] hover:bg-[#003366]/5 transition-all ${
                        fileUploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Upload className="w-5 h-5 text-[#6F6F6F]" />
                      <span className="text-sm text-[#6F6F6F]">
                        {fileUploading ? "Uploading..." : "Choose Files"}
                      </span>
                    </label>

                    {/* Display Uploaded Files */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#030E18]">
                          Uploaded Files ({attachments.length})
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {attachments.map((url, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-[#F8F8F8] rounded-lg"
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#003366] hover:text-[#002244] text-sm truncate flex-1 mr-2"
                                title={url}
                              >
                                📎 {url.split("/").pop()?.slice(0, 20)}...
                              </a>
                              <button
                                onClick={() => removeAttachment(url)}
                                className="p-1 text-[#878787] hover:text-red-600 hover:bg-red-50 rounded"
                                title="Remove"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="bg-white rounded-lg p-4 shadow-none border border-[#F0F0F0]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#003366]/10 rounded-lg">
                      <Clock className="w-5 h-5 text-[#003366]" />
                    </div>
                    <h3 className="font-semibold text-[#030E18]">Status</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6F6F6F]">
                        Course Selected
                      </span>
                      {courseId ? (
                        <CheckCircle className="w-4 h-4 text-[#003366]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6F6F6F]">
                        Term Loaded
                      </span>
                      {termId ? (
                        <CheckCircle className="w-4 h-4 text-[#003366]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6F6F6F]">
                        Content Added
                      </span>
                      {content &&
                      content !== "<p>Enter curriculum content here...</p>" ? (
                        <CheckCircle className="w-4 h-4 text-[#003366]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#F0F0F0]"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Enhanced Toolbar */}
              <div className="p-4 bg-white border-b border-[#F0F0F0]">
                <div className="flex flex-wrap gap-1 items-center">
                  {/* Font Controls */}
                  <div className="flex items-center gap-2 pr-3 border-r border-[#F0F0F0]">
                    <select
                      value={selectedFont}
                      onChange={(e) => applyFont(e.target.value)}
                      className="px-3 py-2 border border-[#F0F0F0] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    >
                      {fonts.map((font) => (
                        <option
                          key={font}
                          value={font}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => applyFontSize(Number(e.target.value))}
                      className="w-16 px-2 py-2 border border-[#F0F0F0] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      min="8"
                      max="72"
                    />
                  </div>

                  {/* Format Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-[#F0F0F0]">
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`p-2 rounded-lg hover:bg-[#F8F8F8] transition-colors ${
                        editor.isActive("bold")
                          ? "bg-[#003366]/10 text-[#003366]"
                          : "text-[#6F6F6F]"
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                      className={`p-2 rounded-lg hover:bg-[#F8F8F8] transition-colors ${
                        editor.isActive("italic")
                          ? "bg-[#003366]/10 text-[#003366]"
                          : "text-[#6F6F6F]"
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive("underline")
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Underline"
                    >
                      <UnderlineIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Color Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                        title="Text Color"
                      >
                        <Palette className="w-4 h-4" />
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-20">
                          <div className="grid grid-cols-5 gap-2">
                            {colors.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyColor(color)}
                                className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowHighlightPicker(!showHighlightPicker)
                        }
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                        title="Highlight"
                      >
                        <Highlighter className="w-4 h-4" />
                      </button>
                      {showHighlightPicker && (
                        <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-20">
                          <div className="grid grid-cols-5 gap-2">
                            {colors.map((color) => (
                              <button
                                key={color}
                                onClick={() => applyHighlight(color)}
                                className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alignment Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                    <button
                      onClick={() =>
                        editor.chain().focus().setTextAlign("left").run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive({ textAlign: "left" })
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().setTextAlign("center").run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive({ textAlign: "center" })
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().setTextAlign("right").run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive({ textAlign: "right" })
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Align Right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().setTextAlign("justify").run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive({ textAlign: "justify" })
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Justify"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>
                  </div>

                  {/* List Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                    <button
                      onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive("bulletList")
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive("orderedList")
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                      }
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive("blockquote")
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Quote"
                    >
                      <Quote className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Insert Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                    <button
                      onClick={insertTable}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                      title="Insert Table"
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={addImageFromUrl}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                      title="Insert Image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={toggleLink}
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        editor.isActive("link")
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-600"
                      }`}
                      title="Insert Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* History Controls */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                    <button
                      onClick={() => editor.chain().focus().undo().run()}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!editor.can().undo()}
                      title="Undo"
                    >
                      <Undo className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => editor.chain().focus().redo().run()}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!editor.can().redo()}
                      title="Redo"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Heading Selector */}
                  <div className="px-3">
                    <select
                      onChange={(e) => {
                        const level = parseInt(e.target.value);
                        if (level === 0) {
                          editor.chain().focus().setParagraph().run();
                        } else {
                          editor
                            .chain()
                            .focus()
                            .toggleHeading({
                              level: level as 1 | 2 | 3 | 4 | 5 | 6,
                            })
                            .run();
                        }
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Heading Level"
                    >
                      <option value="0">Normal Text</option>
                      <option value="1">Heading 1</option>
                      <option value="2">Heading 2</option>
                      <option value="3">Heading 3</option>
                      <option value="4">Heading 4</option>
                      <option value="5">Heading 5</option>
                      <option value="6">Heading 6</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 p-6 bg-gray-50">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none p-6 focus:outline-none min-h-[600px]"
                    style={{
                      fontFamily: selectedFont,
                      fontSize: `${fontSize}px`,
                    }}
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {courseId &&
                  termId &&
                  content &&
                  content !== "<p>Enter curriculum content here...</p>" ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Ready to save</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">
                        Complete all required fields
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {onClose && (
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 border border-[#F0F0F0] text-[#6F6F6F] rounded-lg hover:bg-[#F8F8F8] transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-[#003366] text-white px-8 py-3 rounded-lg hover:bg-[#002244] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-none"
                    disabled={
                      isLoading || !courseId || !termId || fileUploading
                    }
                  >
                    <Save className="w-5 h-5" />
                    {isLoading
                      ? "Saving..."
                      : editingCurriculumId
                      ? "Update Curriculum"
                      : "Save Curriculum"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumEditor;
