/**
 * @jest-environment jsdom
 */
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import { FontSize } from "@/components/curriculum/editor/fontSize";

/** A headless editor with the marks the curriculum editor uses for size. */
function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, TextStyle, FontSize], content });
}

describe("FontSize extension", () => {
  it("stores the size in the saved HTML, so the view page shows what the editor showed", () => {
    const editor = makeEditor("<p>Hello</p>");
    editor.chain().selectAll().setFontSize("24px").run();
    expect(editor.getHTML()).toContain("font-size: 24px");
    editor.destroy();
  });

  it("reads a size back out of saved content", () => {
    const editor = makeEditor('<p><span style="font-size: 18px">Hello</span></p>');
    editor.commands.selectAll();
    expect(editor.getAttributes("textStyle").fontSize).toBe("18px");
    editor.destroy();
  });

  it("leaves text without a size alone", () => {
    const editor = makeEditor("<p>Hello</p>");
    expect(editor.getHTML()).not.toContain("font-size");
    editor.destroy();
  });
});
