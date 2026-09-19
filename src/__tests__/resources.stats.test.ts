import { computeResourceStats, filterResources } from "@/hooks/resources/stats";
import type { Resource } from "@/hooks/resources/types";

const NOW = new Date("2026-09-18T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const make = (name: string, uploadDate: string, classId: Resource["classId"] = { _id: "cl1" }): Resource => ({
  _id: name,
  name,
  classId,
  courseId: { _id: "co1" },
  uploadedBy: { _id: "t1" },
  termId: { _id: "tm1" },
  uploadDate,
  image: "",
  files: [],
});

describe("computeResourceStats", () => {
  it("counts the week, the last three days and distinct classes", () => {
    const stats = computeResourceStats(
      [make("a", daysAgo(1)), make("b", daysAgo(5), "cl2"), make("c", daysAgo(30), { _id: "cl1" })],
      4,
      NOW,
    );
    expect(stats).toEqual({ totalResources: 3, thisWeekResources: 2, recentResources: 1, uniqueClasses: 2, totalAssignedClasses: 4 });
  });

  it("counts a resource with an unreadable date in the total only", () => {
    const stats = computeResourceStats([make("a", "garbage")], 0, NOW);
    expect(stats.totalResources).toBe(1);
    expect(stats.thisWeekResources).toBe(0);
    expect(stats.recentResources).toBe(0);
  });

  it("does not count uploads dated in the future as this week's", () => {
    expect(computeResourceStats([make("a", daysAgo(-2))], 0, NOW).thisWeekResources).toBe(0);
  });

  it("is all zeros for no resources", () => {
    expect(computeResourceStats([], 0, NOW)).toEqual({
      totalResources: 0,
      thisWeekResources: 0,
      recentResources: 0,
      uniqueClasses: 0,
      totalAssignedClasses: 0,
    });
  });
});

describe("filterResources", () => {
  const list = [make("Algebra notes", daysAgo(1)), make("Geometry worksheet", daysAgo(2))];

  it("matches case-insensitively on the name", () => {
    expect(filterResources(list, "ALGEBRA").map((r) => r.name)).toEqual(["Algebra notes"]);
  });

  it("returns everything for a blank search", () => {
    expect(filterResources(list, "  ")).toHaveLength(2);
  });
});
