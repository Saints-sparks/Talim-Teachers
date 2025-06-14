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
  ImageIcon, Link as LinkIcon, Plus, Minus
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCurriculum } from "../../app/hooks/useCurriculum";
import { getCurrentTerm } from "../../app/services/api.service";       
import { useAuth } from "../../app/hooks/useAuth";



interface CurriculumEditorProps {
    onClose?: () => void;
  }
  
  const CurriculumEditor: React.FC<CurriculumEditorProps> = ({ onClose }) => {

    const { getAccessToken } = useAuth();
    const { addCurriculum, isLoading } = useCurriculum();
    
    const [courseId, setCourseId] = useState<string>(""); // Changed to courseId for clarity
    const [termId, setTermId] = useState<string>("");
    const [content, setContent] = useState<string>("");
    const [selectedFont, setSelectedFont] = useState<string>("Arial");
    const [fontSize, setFontSize] = useState<number>(14);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
    const [termLoading, setTermLoading] = useState<boolean>(false);
  
  const fonts = [
    "Arial", "Times New Roman", "Calibri", "Georgia", "Verdana", 
    "Comic Sans MS", "Impact", "Trebuchet MS", "Courier New"
  ];

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#008000"
  ];

  // Initialize editor with enhanced extensions
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

  // Fetch current term on mount
  useEffect(() => {
    let isMounted = true;

    const fetchCurrentTerm = async () => {
      if (termLoading) return;
      
      setTermLoading(true);
      try {
        const token = getAccessToken();
        if (!token) {
          toast.error("No authentication token found");
          return;
        }
        
        const currentTerm = await getCurrentTerm(token);
        if (isMounted && currentTerm?._id) {
          setTermId(currentTerm._id);
        }
      } catch (error) {
        console.error("Error fetching current term:", error);
        if (isMounted) {
          toast.error("Failed to load current term");
        }
      } finally {
        if (isMounted) {
          setTermLoading(false);
        }
      }
    };

    fetchCurrentTerm();

    return () => {
      isMounted = false;
    };
  }, [getAccessToken]);


  // Font and formatting functions
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

  const handleSave = async () => {
    if (!courseId || !termId || !content) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addCurriculum({
        course: courseId,
        term: termId,
        content
      });
      toast.success("Curriculum created successfully");
      
      // Clear the editor
      editor?.commands.clearContent();
      setContent("");
      setCourseId("");
      
      // Close the editor if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error creating curriculum:", error);
      toast.error("Failed to create curriculum");
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };
  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">{courseId} Curriculum</h2>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Font Selection */}
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

            {/* Font Size */}
            <input
              type="number"
              value={fontSize}
              onChange={(e) => applyFontSize(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              min="8"
              max="72"
            />

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Basic Formatting */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
            >
              <Bold size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
            >
              <Italic size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
            >
              <UnderlineIcon size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Text Color */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-gray-200"
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

            {/* Highlight */}
            <div className="relative">
              <button
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className="p-2 rounded hover:bg-gray-200"
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

            {/* Text Alignment */}
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
            >
              <AlignLeft size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
            >
              <AlignCenter size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
            >
              <AlignRight size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''}`}
            >
              <AlignJustify size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Lists */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
            >
              <List size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
            >
              <ListOrdered size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Insert Elements */}
            <button
              onClick={insertTable}
              className="p-2 rounded hover:bg-gray-200"
            >
              <TableIcon size={16} />
            </button>
            
            <button
              onClick={addImageFromUrl}
              className="p-2 rounded hover:bg-gray-200"
            >
              <ImageIcon size={16} />
            </button>
            
            <button
              onClick={toggleLink}
              className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
            >
              <LinkIcon size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Undo/Redo */}
            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="p-2 rounded hover:bg-gray-200"
              disabled={!editor.can().undo()}
            >
              <Undo size={16} />
            </button>
            
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="p-2 rounded hover:bg-gray-200"
              disabled={!editor.can().redo()}
            >
              <Redo size={16} />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="p-6">
          <EditorContent 
            editor={editor}
            className="prose max-w-none min-h-[500px] focus:outline-none"
            style={{ 
              fontFamily: selectedFont,
              fontSize: `${fontSize}px`
            }}
          />
        </div>

        {/* Save Button */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Auto-save enabled • Last saved: Never
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isLoading}
          >
            <Save size={16} />
            {isLoading ? "Saving..." : "Save Curriculum"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurriculumEditor;