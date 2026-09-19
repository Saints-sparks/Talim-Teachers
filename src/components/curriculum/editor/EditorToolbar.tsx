import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
  type LucideIcon,
} from "lucide-react";

const FONTS = [
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

const COLORS = [
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

/** The font size the canvas starts at, and the bounds the size input accepts. */
export const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 72;

/** One toolbar button. */
function ToolbarButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? "bg-blue-100 text-blue-600" : "text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

/** A vertical group of controls separated from the next by a rule. */
function Group({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return <div className={`flex items-center gap-1 px-3 ${last ? "" : "border-r border-gray-200"}`}>{children}</div>;
}

/** A colour swatch button that opens a palette. */
function ColorMenu({
  title,
  icon: Icon,
  onPick,
}: {
  title: string;
  icon: LucideIcon;
  onPick: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolbarButton title={title} active={open} onClick={() => setOpen(!open)}>
        <Icon className="w-4 h-4" />
      </ToolbarButton>
      {open && (
        <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-20">
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => {
                  onPick(color);
                  setOpen(false);
                }}
                className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`${title} ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ALIGNMENTS: Array<{ value: "left" | "center" | "right" | "justify"; icon: LucideIcon; title: string }> = [
  { value: "left", icon: AlignLeft, title: "Align Left" },
  { value: "center", icon: AlignCenter, title: "Align Center" },
  { value: "right", icon: AlignRight, title: "Align Right" },
  { value: "justify", icon: AlignJustify, title: "Justify" },
];

/**
 * The size, in px, applied to the selection, read back from the mark.
 *
 * @param editor - The editor.
 * @returns The selection's font size, or the canvas default.
 */
function currentFontSize(editor: Editor): number {
  const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE;
}

/**
 * The formatting toolbar above the editor canvas. Every control acts on the
 * selection (or on what is typed next), so what the teacher sees is what is
 * saved.
 *
 * @param props - Toolbar props.
 * @param props.editor - The TipTap editor the controls drive.
 * @returns The toolbar element.
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  const insertImageFromUrl = () => {
    const url = window.prompt("Enter image URL:");
    if (url) chain().setImage({ src: url }).run();
  };

  const toggleLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  const onFontSizeChange = (value: string) => {
    const size = Number(value);
    if (Number.isFinite(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
      chain().setFontSize(`${size}px`).run();
    }
  };

  const onHeadingChange = (value: string) => {
    const level = parseInt(value, 10);
    if (level === 0) chain().setParagraph().run();
    else chain().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  return (
    <div className="p-4 bg-white border-b border-[#F0F0F0]" data-guide="curriculum-editor-toolbar">
      <div className="flex flex-wrap gap-1 items-center">
        <div className="flex items-center gap-2 pr-3 border-r border-[#F0F0F0]">
          <select
            value={(editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "Arial"}
            onChange={(e) => chain().setFontFamily(e.target.value).run()}
            className="px-3 py-2 border border-[#F0F0F0] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            aria-label="Font"
          >
            {FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={currentFontSize(editor)}
            onChange={(e) => onFontSizeChange(e.target.value)}
            className="w-16 px-2 py-2 border border-[#F0F0F0] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#003366]"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            aria-label="Font size"
          />
        </div>

        <Group>
          <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
        </Group>

        <Group>
          <ColorMenu title="Text Color" icon={Palette} onPick={(color) => chain().setColor(color).run()} />
          <ColorMenu title="Highlight" icon={Highlighter} onPick={(color) => chain().toggleHighlight({ color }).run()} />
        </Group>

        <Group>
          {ALIGNMENTS.map(({ value, icon: Icon, title }) => (
            <ToolbarButton key={value} title={title} active={editor.isActive({ textAlign: value })} onClick={() => chain().setTextAlign(value).run()}>
              <Icon className="w-4 h-4" />
            </ToolbarButton>
          ))}
        </Group>

        <Group>
          <ToolbarButton title="Bullet List" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Numbered List" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Quote" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </Group>

        <Group>
          <ToolbarButton title="Insert Table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Insert Image" onClick={insertImageFromUrl}>
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Insert Link" active={editor.isActive("link")} onClick={toggleLink}>
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
        </Group>

        <Group>
          <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </Group>

        <Group last>
          <select
            onChange={(e) => onHeadingChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Heading Level"
            aria-label="Heading level"
            value={[1, 2, 3, 4, 5, 6].find((level) => editor.isActive("heading", { level })) ?? 0}
          >
            <option value="0">Normal Text</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                Heading {level}
              </option>
            ))}
          </select>
        </Group>
      </div>
    </div>
  );
}
