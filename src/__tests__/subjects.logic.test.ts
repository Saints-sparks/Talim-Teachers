import {
  courseClassId,
  curriculumCreateRoute,
  curriculumEditRoute,
  timetableLabel,
} from "@/hooks/subjects/subjects.logic";

describe("courseClassId", () => {
  it("reads a bare id, a populated class and a missing class", () => {
    expect(courseClassId("c1")).toBe("c1");
    expect(courseClassId({ _id: "c2" })).toBe("c2");
    expect(courseClassId({ id: "c3" })).toBe("c3");
    expect(courseClassId(undefined)).toBe("");
    expect(courseClassId({})).toBe("");
  });
});

describe("timetableLabel", () => {
  it("says when nothing is scheduled", () => {
    expect(timetableLabel(undefined)).toBe("Schedule not set");
    expect(timetableLabel([])).toBe("Schedule not set");
    expect(timetableLabel([{}])).toBe("Schedule not set");
  });

  it("shows the first slot and counts the rest", () => {
    expect(timetableLabel([{ day: "Monday", startTime: "08:00", endTime: "09:00" }])).toBe("Monday 08:00 - 09:00");
    expect(timetableLabel([{ day: "Monday", time: "08:00 - 09:00" }, { day: "Friday" }, { day: "Friday" }])).toBe(
      "Monday 08:00 - 09:00 +2 more",
    );
  });
});

describe("curriculum routes", () => {
  const course = { _id: "course 1", title: "Maths & Logic", courseCode: "MTH 101" };

  it("encodes the course into the create route", () => {
    const url = new URL(curriculumCreateRoute(course, "t1"), "http://x");
    expect(url.pathname).toBe("/curriculum");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      courseId: "course 1",
      termId: "t1",
      mode: "create",
      courseTitle: "Maths & Logic",
      courseCode: "MTH 101",
    });
  });

  it("carries the curriculum id on the edit route and omits a missing course code", () => {
    const url = new URL(curriculumEditRoute({ _id: "c1", title: "Art" }, "t1", "cur9"), "http://x");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      courseId: "c1",
      termId: "t1",
      mode: "edit",
      curriculumId: "cur9",
      courseTitle: "Art",
    });
  });
});
