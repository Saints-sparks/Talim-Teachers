import {
  classOptions,
  formatUploadDate,
  recordId,
  resourceClassName,
  resourceCourseName,
  resourceTermName,
  resourceUrl,
} from "@/hooks/resources/display";
import { refId, type Resource } from "@/hooks/resources/types";

const resource = (overrides: Partial<Resource> = {}): Resource => ({
  _id: "r1",
  name: "Algebra notes",
  classId: { _id: "cl1", name: "SS2 A" },
  courseId: { _id: "co1", description: "Algebra" },
  uploadedBy: { _id: "t1" },
  termId: { _id: "tm1", name: "First term" },
  uploadDate: "2026-09-10T10:00:00.000Z",
  image: "https://cdn.test/cover.png",
  files: ["https://cdn.test/notes.pdf"],
  ...overrides,
});

describe("resourceCourseName", () => {
  const courses = [{ _id: "co1", title: "Mathematics", courseCode: "MTH101" }];

  it("resolves the title from the teacher's course list, because the API populates only the description", () => {
    expect(resourceCourseName(resource(), courses)).toBe("MTH101 - Mathematics");
  });

  it("uses the populated title when the API does send one", () => {
    expect(resourceCourseName(resource({ courseId: { _id: "co9", title: "Physics", courseCode: "PHY" } }), [])).toBe("PHY - Physics");
  });

  it("looks up a bare id", () => {
    expect(resourceCourseName(resource({ courseId: "co1" }), courses)).toBe("MTH101 - Mathematics");
  });

  it("says so when the course cannot be resolved", () => {
    expect(resourceCourseName(resource({ courseId: { _id: "co9" } }), courses)).toBe("No course");
    expect(resourceCourseName(resource({ courseId: null }), courses)).toBe("No course");
  });
});

describe("resourceClassName", () => {
  it("prefers the populated name", () => {
    expect(resourceClassName(resource(), [])).toBe("SS2 A");
  });

  it("falls back to the teacher's class list by id", () => {
    expect(resourceClassName(resource({ classId: "cl2" }), [{ _id: "cl2", name: "SS3 B" }])).toBe("SS3 B");
  });

  it("does not print a raw id for an unknown class", () => {
    expect(resourceClassName(resource({ classId: "cl9" }), [])).toBe("Unassigned Class");
  });
});

describe("resource details", () => {
  it("names the term, never showing an id", () => {
    expect(resourceTermName(resource())).toBe("First term");
    expect(resourceTermName(resource({ termId: "tm1" }))).toBe("Unknown term");
  });

  it("opens the first file, else the cover image, else nothing", () => {
    expect(resourceUrl(resource())).toBe("https://cdn.test/notes.pdf");
    expect(resourceUrl(resource({ files: [] }))).toBe("https://cdn.test/cover.png");
    expect(resourceUrl(resource({ files: [], image: "" }))).toBe("");
  });

  it("formats dates and survives garbage", () => {
    expect(formatUploadDate("2026-09-10T10:00:00.000Z")).toMatch(/September 10, 2026/);
    expect(formatUploadDate("not a date")).toBe("—");
    expect(formatUploadDate(undefined)).toBe("—");
  });

  it("reads ids from populated and bare references", () => {
    expect(refId({ _id: "a" })).toBe("a");
    expect(refId("b")).toBe("b");
    expect(recordId({ id: "c" })).toBe("c");
    expect(recordId(null)).toBe("");
  });
});

describe("classOptions", () => {
  it("merges the lists without duplicates", () => {
    const options = classOptions([[{ _id: "a", name: "A" }], [{ _id: "a", name: "A" }, { _id: "b", name: "B" }]]);
    expect(options.map((o) => o._id)).toEqual(["a", "b"]);
  });

  it("adds the selected course's class when the teacher is not assigned to it", () => {
    const options = classOptions([[{ _id: "a", name: "A" }]], { _id: "co1", classId: { _id: "z", name: "Z" } });
    expect(options).toContainEqual({ _id: "z", name: "Z" });
  });

  it("names a bare course class generically instead of showing its id", () => {
    expect(classOptions([[]], { _id: "co1", classId: "z" })).toEqual([{ _id: "z", name: "Course class" }]);
  });

  it("never yields an option without an id", () => {
    expect(classOptions([[{ name: "no id" }]])).toEqual([]);
  });
});
