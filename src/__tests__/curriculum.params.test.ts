import { parseCurriculumParams, viewRoute } from "@/hooks/curriculum/params";

const source = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

describe("parseCurriculumParams", () => {
  it("reads every parameter the subject cards send", () => {
    expect(
      parseCurriculumParams(
        source({ courseId: "c1", termId: "t1", mode: "edit", curriculumId: "cur1", courseTitle: "Maths", courseCode: "MTH" }),
      ),
    ).toEqual({ courseId: "c1", termId: "t1", mode: "edit", curriculumId: "cur1", courseTitle: "Maths", courseCode: "MTH" });
  });

  it("returns null for absent values and unknown modes", () => {
    const params = parseCurriculumParams(source({ mode: "delete" }));
    expect(params.mode).toBeNull();
    expect(params.courseId).toBeNull();
  });

  it("does not decode titles a second time", () => {
    // URLSearchParams has already turned %25 into %; decoding again would throw.
    const params = parseCurriculumParams(new URLSearchParams("courseTitle=100%25+Maths"));
    expect(params.courseTitle).toBe("100% Maths");
  });
});

describe("viewRoute", () => {
  it("builds the view page url", () => {
    expect(viewRoute("c1", "t1", "cur1")).toBe("/curriculum/view?courseId=c1&termId=t1&curriculumId=cur1");
  });

  it("leaves curriculumId empty when it is not known yet (a new curriculum)", () => {
    expect(viewRoute("c1", "t1", null)).toBe("/curriculum/view?courseId=c1&termId=t1&curriculumId=");
  });
});
