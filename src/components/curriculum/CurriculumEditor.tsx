'use client';
import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { 
  Save, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo, 
  Type, Palette, Highlighter, Table as TableIcon,
  ImageIcon, Link as LinkIcon, Plus, Minus, Upload, Trash
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCurriculum } from "../../app/hooks/useCurriculum";
import { getCurrentTerm } from "../../app/services/api.service";       
import { useAuth } from "../../app/hooks/useAuth";
import useSubjects from "../../app/hooks/useSubjects";

interface CurriculumEditorProps {
  onClose?: () => void;
}

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({ onClose }) => {
  const { getAccessToken } = useAuth();
  const { addCurriculum, isLoading } = useCurriculum();
  const { subjects, loading: subjectsLoading, error: subjectsError, getSubjectsBySchool } = useSubjects();
  
  const [courseId, setCourseId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedFont, setSelectedFont] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(14);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
  const [termLoading, setTermLoading] = useState<boolean>(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState<boolean>(false);

  const fonts = [
    "Arial", "Times New Roman", "Calibri", "Georgia", "Verdana", 
    "Comic Sans MS", "Impact", "Trebuchet MS", "Courier New"
  ];

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#008000"
  ];

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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
          class: 'max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '<p>Enter curriculum content here...</p>',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  const fetchCurrentTerm = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error("No authentication token found");
        return;
      }

      setTermLoading(true);
      setTermError(null);
      const currentTerm = await getCurrentTerm(token);
      console.log("Term data from API:", currentTerm);
      
      if (currentTerm?._id) {
        setTermId(currentTerm._id);
        console.log("Current TermId set:", currentTerm._id);
      } else {
        throw new Error("No term ID returned from API");
      }
    } catch (error) {
      console.error("Error fetching current term:", error);
      setTermError("Failed to load current term. Please try again.");
      toast.error("Failed to load current term");
    } finally {
      setTermLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!termId && !termLoading) {
        await fetchCurrentTerm();
      }

      if (subjects.length === 0 && !subjectsLoading) {
        try {
          await getSubjectsBySchool();
        } catch (error) {
          console.error("Error fetching subjects:", error);
          toast.error("Failed to load subjects");
        }
      }
    };

    if (isMounted) {
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [getAccessToken, termId, termLoading, subjects.length, subjectsLoading, getSubjectsBySchool]);

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
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const addImageFromUrl = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const toggleLink = () => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    
    if (url === null) return;
    
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset || '');
        
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
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

      setAttachments(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setFileUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments(prev => prev.filter(item => item !== url));
    toast.success("Attachment removed");
  };

  const handleSave = async () => {
    console.log("Attempting to save with - Term ID:", termId, "Course ID:", courseId, "Attachments:", attachments);
    
    if (!courseId) {
      toast.error("Please select a course");
      return;
    }

    if (!termId) {
      toast.error("Term information is not loaded yet");
      return;
    }

    if (!content || content === '<p>Enter curriculum content here...</p>') {
      toast.error("Please enter curriculum content");
      return;
    }

    const userData = localStorage.getItem('user');
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

      console.log("Creating curriculum with:", {
        course: courseId,
        term: termId,
        content,
        teacherId: user.userId,
        attachments,
      });

      await addCurriculum({
        course: courseId,
        term: termId,
        content,
        teacherId: user.userId,
        attachments,
      });
      
      toast.success("Curriculum created successfully");

      editor?.commands.clearContent();
      setContent("");
      setCourseId("");
      setAttachments([]);

      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error("Error creating curriculum:", error);
      toast.error(error.message || "Failed to create curriculum");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!editor) {
    return <div className="flex justify-center items-center h-screen">Loading editor...</div>;
  }

  const selectedSubject = subjects.find(subject => subject._id === courseId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-800">
              {selectedSubject ? `${selectedSubject.name} Curriculum` : "Curriculum Editor"}
            </h2>
            
            {/* Course Selection */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Course/Subject *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={subjectsLoading}
              >
                <option value="">
                  {subjectsLoading ? "Loading courses..." : "Select a course/subject"}
                </option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
              
              {subjectsError && (
                <p className="mt-1 text-sm text-red-600">
                  Error loading subjects: {subjectsError}
                </p>
              )}
            </div>
  
            {/* Term Info */}
            <div className="mt-3">
              {termLoading ? (
                <div className="flex items-center">
                  <span className="inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></span>
                  <span className="text-sm text-gray-600">Loading term information...</span>
                </div>
              ) : termId ? (
                <p className="text-sm text-gray-600">
                  Current Term: {termId}
                </p>
              ) : (
                <div className="flex items-center">
                  <p className="text-sm text-red-600 mr-2">
                    {termError || "Term information not available"}
                  </p>
                  <button 
                    onClick={fetchCurrentTerm}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Attachments
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && uploadFilesToCloudinary(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,application/pdf"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm cursor-pointer hover:bg-gray-50 ${fileUploading ? 'opacity-50' : ''}`}
                >
                  <Upload size={16} />
                  {fileUploading ? "Uploading..." : "Choose Files"}
                </label>
              </div>
              
              {/* Display Uploaded Files */}
              {attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                  <ul className="mt-1 space-y-1">
                    {attachments.map((url, index) => (
                      <li key={index} className="flex items-center justify-between text-sm text-gray-600">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-xs"
                        >
                          {url.split('/').pop()}
                        </a>
                        <button
                          onClick={() => removeAttachment(url)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          <Trash size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
  
          {/* Close Button */}
          {onClose && (
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ✕
            </button>
          )}
        </div>
  
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedFont}
              onChange={(e) => applyFont(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              {fonts.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
  
            <input
              type="number"
              value={fontSize}
              onChange={(e) => applyFontSize(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              min="8"
              max="72"
            />
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
              title="Underline"
            >
              <UnderlineIcon size={16} />
            </button>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-gray-200"
                title="Text Color"
              >
                <Palette size={16} />
              </button>
              {showColorPicker && (
                <div className="absolute top-10 left-0 bg-white border border-gray-300 rounded p-2 shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => applyColor(color)}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
  
            <div className="relative">
              <button
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className="p-2 rounded hover:bg-gray-200"
                title="Highlight"
              >
                <Highlighter size={16} />
              </button>
              {showHighlightPicker && (
                <div className="absolute top-10 left-0 bg-white border border-gray-300 rounded p-2 shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => applyHighlight(color)}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''}`}
              title="Justify"
            >
              <AlignJustify size={16} />
            </button>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
  
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-300' : ''}`}
              title="Quote"
            >
              <Quote size={16} />
            </button>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <button
              onClick={insertTable}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Table"
            >
              <TableIcon size={16} />
            </button>
            
            <button
              onClick={addImageFromUrl}
              className="p-2 rounded hover:bg-gray-200"
              title="Insert Image"
            >
              <ImageIcon size={16} />
            </button>
            
            <button
              onClick={toggleLink}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
              title="Insert Link"
            >
              <LinkIcon size={16} />
            </button>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="p-2 rounded hover:bg-gray-200"
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="p-2 rounded hover:bg-gray-200"
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo size={16} />
            </button>
  
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
  
            <select
              onChange={(e) => {
                const level = parseInt(e.target.value);
                if (level === 0) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                }
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
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
  
        {/* Editor Content */}
        <div className="p-6">
          <EditorContent 
            editor={editor}
            className="prose max-w-none min-h-[500px] focus:outline-none border border-gray-200 rounded p-4"
            style={{ 
              fontFamily: selectedFont,
              fontSize: `${fontSize}px`
            }}
          />
        </div>
  
        {/* Save Button */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {courseId && termId ? "Ready to save" : "Please select course and ensure term is loaded"}
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-[#003366] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isLoading || !courseId || !termId || subjectsLoading || termLoading || fileUploading}
            >
              <Save size={16} />
              {isLoading ? "Saving..." : "Save Curriculum"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumEditor;