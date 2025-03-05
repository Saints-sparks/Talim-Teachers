"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaChevronLeft, FaStrikethrough, FaCheckCircle } from "react-icons/fa";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import TextAlign from "@tiptap/extension-text-align";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Heading from "@tiptap/extension-heading";
import FontSize from "tiptap-extension-font-size";
import FontFamily from "@tiptap/extension-font-family";
import { FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight, FiDownload, FiSave, FiAlignJustify } from "react-icons/fi";
import TextStyle from "@tiptap/extension-text-style";
import { LuHeading1, LuHeading2, LuHeading3 } from "react-icons/lu";
import { MdFormatListBulleted } from "react-icons/md";
import { GoListOrdered } from "react-icons/go";


const SubjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { subjectId } = useParams();
  const [showEditor, setShowEditor] = useState(false);
  const [content, setContent] = useState(" ");
  const [showSavedPopup, setShowSavedPopup] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      Strike,
      BulletList,
      OrderedList,
      ListItem,
      Heading.configure({ levels: [1, 2, 3] }),
      FontSize,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  if (!editor) return null;

   // Function to handle saving and show the popup
   const handleSave = () => {
    // Simulate saving process
    console.log("Content saved:", content);

    // Show the popup
    setShowSavedPopup(true);

    // Hide after 3 seconds
    setTimeout(() => {
      setShowSavedPopup(false);
    }, 3000);
  };

  return (
    <div className="p-6 bg-[#f3f3f3] h-screen">
      {/* Back Button */}
      <button onClick={() => router.back()} className="flex items-center text-gray-600 mb-4">
        <FaChevronLeft className="mr-2" />
      </button>

      {/* Subject Title */}
      <div className="bg-white p-4 rounded-t-md text-center font-semibold text-lg h-14">
        {Array.isArray(subjectId) ? subjectId.join(" ").replace(/-/g, " ") : subjectId?.replace(/-/g, " ")}
      </div>

      {!showEditor ? (
        <div className="flex flex-col items-center justify-center mt-8">
          <img src="/image/subject/curriculum.png" alt="No Curriculum" className="w-80 h-80 mb-4" />
          <p className="text-gray-600">There are no curriculum yet for now.</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 text-black rounded-md flex items-center"
            onClick={() => setShowEditor(true)}
          >
            + Create Curriculum
          </button>
        </div>
      ) : (
        <div className="mt-2">
          {/* Editor Container */}
          <div className="bg-white rounded-md shadow-lg p-4">
            <h2 className="text-center text-base font-normal text-[#030E18]">English Language</h2>

            {/* Toolbar */}
            <div className="flex items-center gap-2 border-y py-3 mt-3">
              <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
              >
              <FiBold />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
              >
              <FiItalic />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
              >
              <FiUnderline />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
              >
              <FaStrikethrough />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
              >
              <MdFormatListBulleted />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
              >
              <GoListOrdered />
              </button>
              <button
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
              >
              <FiAlignLeft />
              </button>
              <button
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
              >
              <FiAlignCenter />
              </button>
              <button
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
              >
              <FiAlignRight />
              </button>
              <button
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''}`}
              >
              <FiAlignJustify />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
              >
              <LuHeading1 />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
              >
              <LuHeading2 />
              </button>
              <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 rounded hover:bg-gray-100 text-[#030E18] ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''}`}
              >
              <LuHeading3 />
              </button>
                <div className="flex items-center gap-2">
                <button
                onClick={() => editor.chain().focus().setFontSize(`${parseInt(editor.getAttributes('textStyle').fontSize ?? '16') - 2}px`).run()}
                className="p-2 rounded hover:bg-gray-100 text-[#030E18]"
                >
                -
                </button>
                <span className="p-2 border rounded text-[#030E18]">
                {parseInt(editor.getAttributes('textStyle').fontSize ?? '16')}
                </span>
                <button
                onClick={() => editor.chain().focus().setFontSize(`${parseInt(editor.getAttributes('textStyle').fontSize ?? '16') + 2}px`).run()}
                className="p-2 rounded hover:bg-gray-100 text-[#030E18]"
                >
                +
                </button>
                </div>
              <select
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              className="p-2 border rounded text-[#030E18]"
              >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              </select>
              <button className="p-2 rounded hover:bg-gray-100 text-[#030E18]">
              <FiDownload />
              </button>
                <button
                className="p-2 rounded hover:bg-gray-100 text-[#030E18] flex items-center gap-1"
                onClick={handleSave}
                >
                <FiSave /> Save
                </button>
            </div>

            {/* Text Editor */}
            <div className="p-4 mt-10 text-[#030E18] bg-[#F3F3F3] min-h-[500px] w-[849px] overflow-auto mx-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      )}

      {/* Saved Popup */}
      {showSavedPopup && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white text-black border px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-opacity duration-300">
          <FaCheckCircle className="text-[#003366]" />
          <span>Saved</span>
        </div>
      )}
    </div>
  );
};

export default SubjectDetailPage;
