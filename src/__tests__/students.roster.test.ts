import {
  filterStudents,
  isStudentActive,
  rosterCsvRows,
  studentFullName,
  studentInitials,
  type StudentRecord,
} from "@/app/services/students/students.service";

const student = (id: string, over: Partial<StudentRecord> = {}, user: Partial<StudentRecord["userId"]> = {}): StudentRecord => ({
  _id: id,
  userId: { _id: `u${id}`, firstName: "Ada", lastName: "Bello", email: `ada${id}@school.test`, ...user },
  classId: { _id: "c1", name: "JSS 1A" },
  admissionNumber: `ADM-${id}`,
  ...over,
});

describe("isStudentActive", () => {
  it("treats a missing flag as active, because the server defaults it to true", () => {
    expect(isStudentActive({})).toBe(true);
    expect(isStudentActive({ isActive: true })).toBe(true);
    expect(isStudentActive({ isActive: false })).toBe(false);
  });
});

describe("names", () => {
  it("builds the full name and initials, surviving missing names", () => {
    expect(studentFullName(student("1"))).toBe("Ada Bello");
    expect(studentInitials(student("1"))).toBe("AB");
    expect(studentFullName(student("2", {}, { firstName: "", lastName: "" }))).toBe("");
    expect(studentInitials(student("2", {}, { firstName: "", lastName: "" }))).toBe("?");
  });
});

describe("filterStudents", () => {
  const roster = [
    student("1", {}, { firstName: "Ada", lastName: "Bello" }),
    student("2", { isActive: false }, { firstName: "Chidi", lastName: "Okafor", email: "chidi@school.test" }),
    student("3", { admissionNumber: "XYZ-777" }, { firstName: "Bola", lastName: "Adeyemi" }),
  ];

  it("matches name, email and admission number, ignoring case", () => {
    expect(filterStudents(roster, "OKAFOR", "all").map((s) => s._id)).toEqual(["2"]);
    expect(filterStudents(roster, "chidi@school", "all").map((s) => s._id)).toEqual(["2"]);
    expect(filterStudents(roster, "xyz-777", "all").map((s) => s._id)).toEqual(["3"]);
  });

  it("combines the text search with the status filter", () => {
    expect(filterStudents(roster, "", "active").map((s) => s._id)).toEqual(["1", "3"]);
    expect(filterStudents(roster, "", "inactive").map((s) => s._id)).toEqual(["2"]);
    expect(filterStudents(roster, "chidi", "active")).toEqual([]);
  });

  it("returns everyone for a blank query", () => {
    expect(filterStudents(roster, "   ", "all")).toHaveLength(3);
  });
});

describe("rosterCsvRows", () => {
  it("exports only columns the roster endpoint actually returns", () => {
    const { headers, rows } = rosterCsvRows([student("1"), student("2", { isActive: false })]);
    expect(headers).toEqual(["Name", "Email", "Admission No", "Status"]);
    expect(rows).toEqual([
      ["Ada Bello", "ada1@school.test", "ADM-1", "Active"],
      ["Ada Bello", "ada2@school.test", "ADM-2", "Inactive"],
    ]);
  });
});
