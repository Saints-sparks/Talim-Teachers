import { Extension } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Sets the font size (a CSS length such as `"18px"`) on the selection. */
      setFontSize: (size: string) => ReturnType;
    };
  }
}

/**
 * A font-size attribute on the `textStyle` mark. TipTap ships `FontFamily` and
 * `Color` for this mark but no font size, and the editor's size control called
 * a command that did not exist, so the size only ever changed the canvas and
 * was never saved. With this extension the size is stored in the content's
 * `style` attribute like the font and colour are.
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
    };
  },
});
