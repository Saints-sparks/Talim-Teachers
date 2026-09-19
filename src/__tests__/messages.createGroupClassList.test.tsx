/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateGroupClassList from "@/components/messages/CreateGroupClassList";

const classes = [
  { _id: "c1", name: "JSS 1A", students: [{}, {}] },
  { _id: "c2", name: "SS 2B", studentCount: 30 },
];

const baseProps = {
  classes,
  searchTerm: "",
  onSearchChange: jest.fn(),
  isLoading: false,
  isCreating: false,
  onBack: jest.fn(),
  onSelect: jest.fn(),
};

describe("CreateGroupClassList", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists the classes with their student counts and reports the one picked", async () => {
    const user = userEvent.setup();
    render(<CreateGroupClassList {...baseProps} />);

    expect(screen.getByText("2 students")).toBeInTheDocument();
    expect(screen.getByText("30 students")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /SS 2B/ }));
    expect(baseProps.onSelect).toHaveBeenCalledWith(classes[1]);
  });

  it("filters by the search term and says when nothing matches", () => {
    const { rerender } = render(<CreateGroupClassList {...baseProps} searchTerm="jss" />);
    expect(screen.getByText("JSS 1A")).toBeInTheDocument();
    expect(screen.queryByText("SS 2B")).not.toBeInTheDocument();

    rerender(<CreateGroupClassList {...baseProps} searchTerm="zzz" />);
    expect(screen.getByText("No classes found matching your search")).toBeInTheDocument();
  });

  it("disables every row while a group is being created", () => {
    render(<CreateGroupClassList {...baseProps} isCreating />);
    for (const row of screen.getAllByRole("button", { name: /students/ })) {
      expect(row).toBeDisabled();
    }
  });

  it("goes back from the header button", async () => {
    const user = userEvent.setup();
    render(<CreateGroupClassList {...baseProps} />);
    await user.click(screen.getAllByRole("button")[0]);
    expect(baseProps.onBack).toHaveBeenCalled();
  });
});
