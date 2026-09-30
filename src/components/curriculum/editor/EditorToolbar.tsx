import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { focusRing } from "@/components/tl/styles";
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

/**
 * One toolbar button: 44px, pressed state for marks that are on.
 *
 * @param props - The button.
 * @param props.title - Its name (also the tooltip).
 * @param props.active - Whether the format is on at the selection.
 * @param props.disabled - Whether it can be used now.
 * @param props.onClick - Applies the format.
 * @param props.children - The icon.
 * @returns The button.
 */
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
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
        active ? "bg-tl-select text-tl-brand" : "text-tl-muted"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A group of controls separated from the next by a rule.
 *
 * @param props - The group.
 * @param props.children - The controls.
 * @param props.last - The last group has no rule after it.
 * @returns The group.
 */
function Group({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return <div className={`flex items-center gap-0.5 px-1.5 ${last ? "" : "border-r border-tl-line-soft"}`}>{children}</div>;
}

/**
 * A colour button that opens a palette of swatches.
 *
 * @param props - The menu.
 * @param props.title - Its name ("Text colour", "Highlight").
 * @param props.icon - Its icon.
 * @param props.onPick - Applies the colour picked.
 * @returns The button and, while open, the palette.
 */
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
        <Icon className="h-4 w-4" aria-hidden />
      </ToolbarButton>
      {open && (
        <div className="absolute left-0 top-12 z-20 rounded-2xl border border-tl-line bg-tl-surface p-3 shadow-[0_18px_40px_-20px_rgba(15,27,46,0.35)]">
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => {
                  onPick(color);
                  setOpen(false);
                }}
                className={`h-8 w-8 rounded-lg border-2 border-tl-line hover:border-tl-muted ${focusRing}`}
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
  { value: "left", icon: AlignLeft, title: "Align left" },
  { value: "center", icon: AlignCenter, title: "Align centre" },
  { value: "right", icon: AlignRight, title: "Align right" },
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
  // What the teacher is typing in the size box. Kept apart from the editor's size so a
  // half-typed "1" on the way to "18" is not snapped back to the current size.
  const [sizeDraft, setSizeDraft] = useState<string | null>(null);

  const insertImageFromUrl = () => {
    const url = window.prompt("Image address (URL):");
    if (url) chain().setImage({ src: url }).run();
  };

  const toggleLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Link address (URL). Leave empty to remove the link:", previousUrl);
    if (url === null) return;
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  const onFontSizeChange = (value: string) => {
    setSizeDraft(value);
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
    <div className="border-b border-tl-line-soft bg-tl-surface px-3 py-2" data-guide="curriculum-editor-toolbar" role="toolbar" aria-label="Formatting">
      <div className="flex flex-wrap items-center gap-y-1">
        <div className="flex items-center gap-2 border-r border-tl-line-soft pr-2">
          <select
            value={(editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "Arial"}
            onChange={(e) => chain().setFontFamily(e.target.value).run()}
            className={`min-h-[44px] rounded-xl border border-tl-control bg-tl-surface px-3 text-sm font-semibold text-tl-ink ${focusRing}`}
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
            value={sizeDraft ?? currentFontSize(editor)}
            onChange={(e) => onFontSizeChange(e.target.value)}
            onBlur={() => setSizeDraft(null)}
            className={`min-h-[44px] w-16 rounded-xl border border-tl-control bg-tl-surface px-2 text-center text-sm font-semibold text-tl-ink ${focusRing}`}
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            aria-label="Font size"
          />
        </div>

        <Group>
          <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
            <Bold className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
            <Italic className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" aria-hidden />
          </ToolbarButton>
        </Group>

        <Group>
          <ColorMenu title="Text colour" icon={Palette} onPick={(color) => chain().setColor(color).run()} />
          <ColorMenu title="Highlight" icon={Highlighter} onPick={(color) => chain().toggleHighlight({ color }).run()} />
        </Group>

        <Group>
          {ALIGNMENTS.map(({ value, icon: Icon, title }) => (
            <ToolbarButton key={value} title={title} active={editor.isActive({ textAlign: value })} onClick={() => chain().setTextAlign(value).run()}>
              <Icon className="h-4 w-4" aria-hidden />
            </ToolbarButton>
          ))}
        </Group>

        <Group>
          <ToolbarButton title="Bulleted list" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
            <List className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Quote" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" aria-hidden />
          </ToolbarButton>
        </Group>

        <Group>
          <ToolbarButton title="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Insert image" onClick={insertImageFromUrl}>
            <ImageIcon className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Insert link" active={editor.isActive("link")} onClick={toggleLink}>
            <LinkIcon className="h-4 w-4" aria-hidden />
          </ToolbarButton>
        </Group>

        <Group>
          <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
            <Undo className="h-4 w-4" aria-hidden />
          </ToolbarButton>
          <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
            <Redo className="h-4 w-4" aria-hidden />
          </ToolbarButton>
        </Group>

        <Group last>
          <select
            onChange={(e) => onHeadingChange(e.target.value)}
            className={`min-h-[44px] rounded-xl border border-tl-control bg-tl-surface px-3 text-sm font-semibold text-tl-ink ${focusRing}`}
            title="Heading level"
            aria-label="Heading level"
            value={[1, 2, 3, 4, 5, 6].find((level) => editor.isActive("heading", { level })) ?? 0}
          >
            <option value="0">Normal text</option>
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
