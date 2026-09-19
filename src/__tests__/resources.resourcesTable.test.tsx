/**
 * @jest-environment jsdom
 */
import React from "react";
import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { ResourcesTable } from "@/components/resources/ResourceTable";
import type { Resource } from "@/hooks/resources/types";

const make = (id: string, name: string): Resource => ({
  _id: id,
  name,
  classId: { _id: "cl1", name: "SS2 A" },
  courseId: { _id: "co1" },
  uploadedBy: { _id: "t1" },
  termId: { _id: "tm1", name: "First term" },
  uploadDate: "2026-09-10T10:00:00.000Z",
  image: "",
  files: ["https://cdn.test/a.pdf"],
});

const courses = [{ _id: "co1", title: "Mathematics", courseCode: "MTH101" }];

describe("ResourcesTable", () => {
  it("shows the course title from the teacher's course list", () => {
    render(<ResourcesTable resources={[make("r1", "Algebra")]} classes={[]} courses={courses} canModify={() => true} />);
    expect(screen.getAllByText("MTH101 - Mathematics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SS2 A").length).toBeGreaterThan(0);
  });

  it("offers delete only for the resources the teacher may change", () => {
    render(
      <ResourcesTable
        resources={[make("r1", "Mine"), make("r2", "Not mine")]}
        classes={[]}
        courses={courses}
        canModify={(resource) => resource._id === "r1"}
      />,
    );
    // Desktop table and mobile cards both render, so each deletable resource appears twice.
    expect(screen.getAllByLabelText("Delete resource")).toHaveLength(2);
  });

  it("offers no delete at all when the teacher may change nothing", () => {
    render(<ResourcesTable resources={[make("r1", "Algebra")]} classes={[]} courses={courses} canModify={() => false} />);
    expect(screen.queryAllByLabelText("Delete resource")).toHaveLength(0);
  });
});
