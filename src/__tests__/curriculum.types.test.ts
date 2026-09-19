import {
  courseOf,
  courseTitle,
  hasContent,
  refId,
  teacherName,
  termOf,
  EDITOR_PLACEHOLDER_HTML,
  type Curriculum,
} from "@/hooks/curriculum/types";
import { htmlToPlainText } from "@/components/curriculum/curriculumPdf";
import { fileNameOf } from "@/components/curriculum/editor/types";

const flat: Curriculum = {
  _id: "cur1",
  course: { _id: "c1", title: "Mathematics", courseCode: "MTH101", className: "SS2", schoolName: "Talim", teacherName: "Ada Bello" },
  term: { _id: "t1", name: "First term" },
  content: "<p>Algebra</p>",
};

describe("curriculum shape helpers", () => {
  it("reads ids from populated and bare references", () => {
    expect(refId("abc")).toBe("abc");
    expect(refId({ _id: "def" })).toBe("def");
    expect(refId(undefined)).toBe("");
  });

  it("returns the populated course and term, or null for a bare id", () => {
    expect(courseOf(flat)?.title).toBe("Mathematics");
    expect(termOf(flat)?.name).toBe("First term");
    expect(courseOf({ ...flat, course: "c1" })).toBeNull();
    expect(termOf({ ...flat, term: "t1" })).toBeNull();
  });

  it("titles a curriculum from title, then name, then the fallback", () => {
    expect(courseTitle(flat)).toBe("Mathematics");
    expect(courseTitle({ ...flat, course: { _id: "c1", name: "Maths" } })).toBe("Maths");
    expect(courseTitle({ ...flat, course: "c1" }, "Course")).toBe("Course");
  });

  it("names the teacher from the populated author, else from the flattened course", () => {
    expect(teacherName(flat)).toBe("Ada Bello");
    expect(teacherName({ ...flat, teacherId: { _id: "u1", firstName: "Chi", lastName: "Obi" } })).toBe("Chi Obi");
    expect(teacherName({ ...flat, course: "c1" })).toBeNull();
  });
});

describe("hasContent", () => {
  it("is false for empty output and the untouched placeholder", () => {
    expect(hasContent("")).toBe(false);
    expect(hasContent("<p></p>")).toBe(false);
    expect(hasContent(EDITOR_PLACEHOLDER_HTML)).toBe(false);
  });

  it("is true once the teacher wrote something", () => {
    expect(hasContent("<p>Week 1: fractions</p>")).toBe(true);
  });
});

describe("htmlToPlainText", () => {
  it("keeps paragraph and list boundaries as line breaks", () => {
    expect(htmlToPlainText("<p>One</p><p>Two</p><ul><li>A</li><li>B</li></ul>")).toBe("One\nTwo\nA\nB");
  });

  it("decodes the entities the editor emits", () => {
    expect(htmlToPlainText("<p>Fish &amp; chips&nbsp;&lt;3</p>")).toBe("Fish & chips <3");
  });
});

describe("fileNameOf", () => {
  it("reads the last path segment, decoded and without the query", () => {
    expect(fileNameOf("https://cdn.test/a/b/Term%201%20plan.pdf?v=2")).toBe("Term 1 plan.pdf");
  });

  it("survives a malformed escape", () => {
    expect(fileNameOf("https://cdn.test/100%.pdf")).toBe("100%.pdf");
  });

  it("falls back when there is no name", () => {
    expect(fileNameOf("https://cdn.test/", "Attachment 1")).toBe("Attachment 1");
  });
});
