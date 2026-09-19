"use client";

import { useState } from "react";
import { useEditor, type Editor } from "@tiptap/react";
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
import { FontSize } from "@/components/curriculum/editor/fontSize";
import { EDITOR_PLACEHOLDER_HTML } from "./types";

/** What {@link useRichTextEditor} returns. */
export interface RichTextEditor {
  /** The TipTap editor; `null` until it has mounted. */
  editor: Editor | null;
  /** The editor's current HTML, updated on every change. */
  html: string;
}

/**
 * The curriculum editor: TipTap with the formatting the toolbar offers, seeded
 * with existing content when editing and with the placeholder text otherwise.
 *
 * @param initialHtml - The curriculum's saved content, or `undefined` for a new one.
 * @returns The editor and its live HTML.
 */
export function useRichTextEditor(initialHtml?: string): RichTextEditor {
  const startingHtml = initialHtml ?? EDITOR_PLACEHOLDER_HTML;
  const [html, setHtml] = useState(startingHtml);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: true, HTMLAttributes: { class: "max-w-full h-auto" } }),
      Link.configure({ openOnClick: false }),
    ],
    content: startingHtml,
    onUpdate: ({ editor: updated }) => setHtml(updated.getHTML()),
  });

  return { editor, html };
}
