import {
  courseName,
  errorMessage,
  filterClasses,
  filterCourses,
  getCourseIcon,
  idOf,
  parseCreatedGroup,
} from "@/components/messages/helpers";

describe("idOf", () => {
  it("returns a string id as is", () => {
    expect(idOf("abc")).toBe("abc");
  });

  it("reads _id, then id, from a populated record (nested too)", () => {
    expect(idOf({ _id: "a1", id: "b2" })).toBe("a1");
    expect(idOf({ id: "b2" })).toBe("b2");
    expect(idOf({ _id: { _id: "deep" } })).toBe("deep");
  });

  it("returns an empty string for nothing usable", () => {
    expect(idOf(undefined)).toBe("");
    expect(idOf(null)).toBe("");
    expect(idOf(42)).toBe("");
    expect(idOf({})).toBe("");
  });
});

describe("errorMessage", () => {
  it("reads the message of an Error or error-like object", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage({ message: "nope" })).toBe("nope");
  });

  it("returns undefined when there is no usable message", () => {
    expect(errorMessage("plain string")).toBeUndefined();
    expect(errorMessage(null)).toBeUndefined();
    expect(errorMessage({ message: "" })).toBeUndefined();
    expect(errorMessage({ message: 5 })).toBeUndefined();
  });
});

describe("filterClasses / filterCourses", () => {
  const classes = [{ _id: "1", name: "JSS 1A" }, { _id: "2", name: "SS 2B" }, { _id: "3" }];
  const courses = [
    { _id: "1", title: "Mathematics" },
    { _id: "2", name: "English Language" },
    { _id: "3" },
  ];

  it("matches class names case-insensitively and skips nameless classes", () => {
    expect(filterClasses(classes, "jss")).toEqual([classes[0]]);
    expect(filterClasses(classes, "")).toEqual([classes[0], classes[1]]);
  });

  it("matches a course by title or name", () => {
    expect(filterCourses(courses, "MATH")).toEqual([courses[0]]);
    expect(filterCourses(courses, "language")).toEqual([courses[1]]);
  });

  it("returns an empty list while the roster is missing", () => {
    expect(filterClasses(undefined, "a")).toEqual([]);
    expect(filterCourses(null, "a")).toEqual([]);
  });
});

describe("courseName / getCourseIcon", () => {
  it("prefers the title over the name", () => {
    expect(courseName({ title: "Physics", name: "Phys" })).toBe("Physics");
    expect(courseName({ name: "Phys" })).toBe("Phys");
    expect(courseName({})).toBeUndefined();
  });

  it("picks an icon from keywords and defaults to a book", () => {
    expect(getCourseIcon("Advanced Mathematics")).toBe("📊");
    expect(getCourseIcon("Chemistry")).toBe("🧪");
    expect(getCourseIcon("Woodwork")).toBe("📖");
    expect(getCourseIcon(undefined)).toBe("📖");
  });
});

describe("parseCreatedGroup", () => {
  it("reads a bare room, preferring _id over roomId over id", () => {
    expect(parseCreatedGroup({ _id: "r1", roomId: "r2" })).toEqual({ roomId: "r1" });
    expect(parseCreatedGroup({ roomId: "r2", id: "r3" })).toEqual({ roomId: "r2" });
    expect(parseCreatedGroup({ id: "r3" })).toEqual({ roomId: "r3" });
  });

  it("unwraps a { data: room } envelope and keeps the reused flag", () => {
    expect(parseCreatedGroup({ data: { _id: "r1", reused: true } })).toEqual({ roomId: "r1", reused: true });
    expect(parseCreatedGroup({ _id: "r1", reused: false })).toEqual({ roomId: "r1", reused: false });
  });

  it("ignores a reused flag that is not a boolean", () => {
    expect(parseCreatedGroup({ _id: "r1", reused: "yes" })).toEqual({ roomId: "r1" });
  });

  it("returns an empty room id for garbage", () => {
    expect(parseCreatedGroup(undefined)).toEqual({ roomId: "" });
    expect(parseCreatedGroup("nope")).toEqual({ roomId: "" });
    expect(parseCreatedGroup({})).toEqual({ roomId: "" });
  });
});
