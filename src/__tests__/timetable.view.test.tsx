/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, within, fireEvent } from "@/test-utils/render";
import { TimetableView, timetableLine, type TimetableMode } from "@/components/timetable/TimetableView";
import {
  FIXTURE_NOW,
  makeDisruptedWeekFixture,
  makeEmptyTimetableWeekFixture,
  makeTimetableWeekFixture,
  timetableWeekFixtureFor,
} from "@/lib/fixtures/today.fixture";
import type { TimetableWeek } from "@/types/today";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));

function renderWeek(week: TimetableWeek = makeTimetableWeekFixture(), mode: TimetableMode = "week") {
  const props = {
    onMode: jest.fn(),
    onWeek: jest.fn(),
    onExportCsv: jest.fn(),
    onPrint: jest.fn(),
    onShareResource: jest.fn(),
  };
  render(<TimetableView week={week} nowMs={Date.parse(FIXTURE_NOW)} mode={mode} {...props} />);
  return props;
}

describe("Timetable, week 3", () => {
  it("heads the page with the week and a count", () => {
    renderWeek();
    expect(screen.getByText("Week 3 · 21 – 25 September · 17 lessons across 3 subjects")).toBeInTheDocument();
  });

  it("draws periods, breaks, days and today's column", () => {
    renderWeek();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: /Period 1 8:00 – 8:40/ })).toBeInTheDocument();
    expect(within(table).getByText("Short break")).toBeInTheDocument();
    expect(within(table).getByText("Lunch")).toBeInTheDocument();
    const friday = within(table).getByRole("columnheader", { name: /Friday/ });
    expect(friday).toHaveTextContent("25 Sep · today");
    expect(friday).toHaveAttribute("aria-current", "date");
    expect(within(table).getAllByText("Free").length).toBeGreaterThan(0);
  });

  it("merges Thursday's double period into one cell spanning two rows", () => {
    renderWeek();
    const cell = screen.getByRole("button", { name: /^Mathematics · JSS1 A, Thursday 10:20 – 11:40/ });
    expect(cell.closest("td")).toHaveAttribute("rowspan", "2");
    expect(within(cell).getByText("Double period · 10:20 – 11:40")).toBeInTheDocument();
  });

  it("outlines the lesson on now and shows rooms", () => {
    renderWeek();
    const now = screen.getByRole("button", { name: /Friday 10:20 – 11:00, Block C, Room 2, on now/ });
    expect(now.className).toContain("border-2");
    expect(within(now).getByText("JSS2 B · Block C, Room 2 · now")).toBeInTheDocument();
  });

  it("shows the legend", () => {
    renderWeek();
    const legend = screen.getByRole("list", { name: "Subjects" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Further Mathematics · JSS2 B",
      "Mathematics · JSS1 A",
      "Mathematics · JSS2 B",
    ]);
  });

  it("navigates weeks and offers print and CSV", () => {
    const props = renderWeek();
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(props.onWeek).toHaveBeenCalledWith("2026-09-14");
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(props.onWeek).toHaveBeenCalledWith("2026-09-28");
    expect(screen.getByRole("button", { name: "This week" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(props.onPrint).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(props.onExportCsv).toHaveBeenCalled();
  });

  it("switches between Week and Today", () => {
    const props = renderWeek();
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(props.onMode).toHaveBeenCalledWith("today");
  });

  it("opens the lesson sheet from a cell", async () => {
    renderWeek();
    fireEvent.click(screen.getByRole("button", { name: /^Mathematics · JSS1 A, Thursday 10:20 – 11:40/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Thursday · Periods 4–5 · 10:20 – 11:40")).toBeInTheDocument();
    expect(within(dialog).getByText(/Room: Block B, Room 4/)).toBeInTheDocument();
    // The scheme of work opens on Subjects, on the course's plan at this week.
    const hrefs = within(dialog).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/subjects?courseId=k1&tab=plan&week=3");
  });
});

describe("one day at a time", () => {
  it("defaults to today's tab and switches days", () => {
    renderWeek(makeTimetableWeekFixture(), "today");
    const tabs = screen.getByRole("tablist", { name: "Day" });
    expect(within(tabs).getByRole("tab", { selected: true })).toHaveTextContent("FriToday");
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("heading", { name: "Friday, 25 Sep" })).toBeInTheDocument();
    expect(within(panel).getByText("Now · 35 min left")).toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole("tab", { name: /Mon/ }));
    expect(within(screen.getByRole("tabpanel")).getByRole("heading", { name: "Monday, 21 Sep" })).toBeInTheDocument();
  });

  it("keeps the grid in the page for printing", () => {
    renderWeek(makeTimetableWeekFixture(), "today");
    expect(screen.getByRole("table").closest("div.print\\:block")).not.toBeNull();
  });
});

describe("disrupted and empty weeks", () => {
  it("labels a holiday column and strikes cancelled lessons with the reason", () => {
    renderWeek(makeDisruptedWeekFixture());
    expect(screen.getByRole("columnheader", { name: /Wednesday/ })).toHaveTextContent("Holiday: Founders' Day");
    expect(screen.getByRole("columnheader", { name: /Friday/ })).toHaveTextContent("Closes 11:00");
    const cancelled = screen.getAllByRole("button", { name: /cancelled: Founders' Day/ });
    expect(cancelled).toHaveLength(3);
    expect(within(cancelled[0]).getByText("Cancelled: Founders' Day")).toBeInTheDocument();
    expect(within(cancelled[0]).getByText(/Mathematics/).className).toContain("line-through");
  });

  it("explains a school with no timetable", () => {
    renderWeek(makeEmptyTimetableWeekFixture());
    expect(screen.getByRole("heading", { name: "No timetable yet" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
  });

  it("says a week outside the term has no lessons", () => {
    const outside = timetableWeekFixtureFor("2026-12-21");
    expect(timetableLine(outside)).toBe("Outside term · 21 – 25 December");
    renderWeek(outside);
    expect(screen.getByRole("heading", { name: "No lessons this week" })).toBeInTheDocument();
    expect(screen.getByText(/outside the term/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Day" })).toBeInTheDocument();
  });
});
