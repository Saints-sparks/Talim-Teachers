import { canWriteForCourse, canWriteRecord, idOf, type WriterContext } from "@/hooks/curriculum/access";

const teacher = (taught: string[] | null): WriterContext => ({
  role: "teacher",
  ownIds: ["user-1", "teacher-1"],
  taughtCourseIds: taught,
});

describe("idOf", () => {
  it("reads a bare id, a populated document and nothing", () => {
    expect(idOf("abc")).toBe("abc");
    expect(idOf({ _id: "def" })).toBe("def");
    expect(idOf({ id: "ghi" })).toBe("ghi");
    expect(idOf(undefined)).toBe("");
    expect(idOf(null)).toBe("");
  });
});

describe("canWriteForCourse", () => {
  it("lets a teacher write for a course they teach", () => {
    expect(canWriteForCourse(teacher(["c1", "c2"]), "c2")).toBe(true);
  });

  it("refuses a course the teacher does not teach", () => {
    expect(canWriteForCourse(teacher(["c1"]), "c9")).toBe(false);
  });

  it("refuses while the roster is still loading, so controls never flash", () => {
    expect(canWriteForCourse(teacher(null), "c1")).toBe(false);
  });

  it("shows sub-admins the controls and leaves the permission check to the API", () => {
    expect(canWriteForCourse({ role: "school_sub_admin", ownIds: [], taughtCourseIds: null }, "c1")).toBe(true);
  });

  it("refuses any other role", () => {
    expect(canWriteForCourse({ role: "student", ownIds: [], taughtCourseIds: ["c1"] }, "c1")).toBe(false);
    expect(canWriteForCourse({ role: undefined, ownIds: [], taughtCourseIds: ["c1"] }, "c1")).toBe(false);
  });
});

describe("canWriteRecord", () => {
  it("lets the uploader change their own record even for a course they do not teach", () => {
    expect(canWriteRecord(teacher([]), { ownerId: { _id: "teacher-1" }, courseId: "c9" })).toBe(true);
    expect(canWriteRecord(teacher([]), { ownerId: "user-1", courseId: "c9" })).toBe(true);
  });

  it("lets a teacher change someone else's record for a course they teach", () => {
    expect(canWriteRecord(teacher(["c1"]), { ownerId: "other", courseId: { _id: "c1" } })).toBe(true);
  });

  it("refuses someone else's record for a course the teacher does not teach", () => {
    expect(canWriteRecord(teacher(["c1"]), { ownerId: "other", courseId: "c2" })).toBe(false);
  });

  it("does not treat a missing owner as a match", () => {
    expect(canWriteRecord(teacher([]), { ownerId: undefined, courseId: "c2" })).toBe(false);
  });
});
