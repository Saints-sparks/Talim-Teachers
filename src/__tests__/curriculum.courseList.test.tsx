/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CourseCurriculumList from "@/components/curriculum/CourseCurriculumList";
import type { Curriculum } from "@/hooks/curriculum/types";

const curriculum: Curriculum = {
  _id: "cur1",
  course: { _id: "c1", title: "Mathematics", className: "SS2 A", schoolName: "Talim Academy", teacherName: "Ada Bello" },
  term: { _id: "t1", name: "First term" },
  content: "<p>x</p>",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
};

const handlers = () => ({ onBack: jest.fn(), onCreate: jest.fn(), onOpen: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn() });

describe("CourseCurriculumList", () => {
  it("shows the curriculum's real teacher, school and class, never 'Unknown'", () => {
    render(<CourseCurriculumList courseName="Mathematics" curriculum={curriculum} canCreate canModify {...handlers()} />);
    expect(screen.getByText("Ada Bello")).toBeInTheDocument();
    expect(screen.getByText("Talim Academy")).toBeInTheDocument();
    expect(screen.getByText("SS2 A")).toBeInTheDocument();
    expect(screen.queryByText(/Unknown/)).not.toBeInTheDocument();
  });

  it("offers Edit and Delete to a teacher of the course", () => {
    const h = handlers();
    render(<CourseCurriculumList courseName="Mathematics" curriculum={curriculum} canCreate canModify {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    expect(h.onDelete).toHaveBeenCalledWith(curriculum);
    expect(h.onOpen).not.toHaveBeenCalled(); // the card's own click must not fire
  });

  it("hides every write control from someone who may not write", () => {
    render(<CourseCurriculumList courseName="Mathematics" curriculum={curriculum} canCreate={false} canModify={false} {...handlers()} />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit curriculum")).not.toBeInTheDocument();
  });

  it("turns Write into Edit once the term has a curriculum (a course has one per term)", () => {
    const h = handlers();
    render(<CourseCurriculumList courseName="Mathematics" curriculum={curriculum} canCreate canModify {...h} />);
    expect(screen.queryByRole("button", { name: "Write the curriculum" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit curriculum" }));
    expect(h.onEdit).toHaveBeenCalledWith(curriculum);
  });

  it("invites a teacher to write the first one, and only a teacher", () => {
    const h = handlers();
    const { rerender } = render(<CourseCurriculumList courseName="Mathematics" curriculum={null} canCreate canModify {...h} />);
    expect(screen.getByRole("heading", { name: "No curriculum yet" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Write the curriculum" }));
    expect(h.onCreate).toHaveBeenCalled();

    rerender(<CourseCurriculumList courseName="Mathematics" curriculum={null} canCreate={false} canModify={false} {...h} />);
    expect(screen.getByRole("heading", { name: "No curriculum yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Write/ })).not.toBeInTheDocument();
  });

  it("reads the whole text with Read, and goes back to Subjects", () => {
    const h = handlers();
    render(<CourseCurriculumList courseName="Mathematics" curriculum={curriculum} canCreate={false} canModify={false} {...h} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mathematics curriculum" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Read the Mathematics curriculum" }));
    expect(h.onOpen).toHaveBeenCalledWith(curriculum);
    fireEvent.click(screen.getByRole("button", { name: "Back to Subjects" }));
    expect(h.onBack).toHaveBeenCalled();
  });
});
