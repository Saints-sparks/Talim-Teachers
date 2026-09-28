/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@/test-utils/render";
import { TodayView } from "@/components/today/TodayView";
import { TodayScreen } from "@/components/today/TodayScreen";
import { todayService } from "@/app/services/today/today.service";
import {
  FIXTURE_NOW,
  makeHolidayTodayFixture,
  makeNoLessonsTodayFixture,
  makeNoTermTodayFixture,
  makeNoTimetableTodayFixture,
  makeTodayFixture,
  makeWeekendTodayFixture,
} from "@/lib/fixtures/today.fixture";
import type { MarkTaughtResponse, TeacherToday } from "@/types/today";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));

jest.mock("@/components/resources/uploadmodal", () => ({ UploadModal: () => null }));

const service = todayService as jest.Mocked<typeof todayService>;
const NOW = Date.parse(FIXTURE_NOW);
const lagos = (hhmm: string) => Date.parse(`2026-09-25T${hhmm}:00+01:00`);

function renderToday(today: TeacherToday = makeTodayFixture(), nowMs = NOW, extra: Partial<React.ComponentProps<typeof TodayView>> = {}) {
  const onUpload = jest.fn();
  const onTour = jest.fn();
  render(<TodayView today={today} nowMs={nowMs} firstName="Seyi" onUpload={onUpload} onTour={onTour} {...extra} />);
  return { onUpload, onTour };
}

describe("Today, 10:25 on Friday 25 September", () => {
  it("greets the teacher and shows the date and term week", () => {
    renderToday();
    expect(screen.getByRole("heading", { level: 1, name: "Good morning, Seyi" })).toBeInTheDocument();
    expect(screen.getByText("Friday, 25 September 2026 · First term, week 3")).toBeInTheDocument();
  });

  it("renders the navy Now card with period, topic, time left and actions", () => {
    renderToday();
    const now = screen.getByRole("region", { name: "The lesson on now" });
    expect(within(now).getByText("Now · Period 4")).toBeInTheDocument();
    expect(within(now).getByText("10:20 – 11:00")).toBeInTheDocument();
    expect(within(now).getByRole("heading", { name: "Mathematics · JSS2 B" })).toBeInTheDocument();
    expect(within(now).getByText("10 students · Block C, Room 2")).toBeInTheDocument();
    expect(within(now).getByText("Indices and standard form")).toBeInTheDocument();
    expect(within(now).getByText(/35 min left · ends 11:00/)).toBeInTheDocument();
    expect(within(now).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "13");
    expect(within(now).getByRole("button", { name: "Open lesson" })).toBeInTheDocument();
    expect(within(now).getByRole("link", { name: "Scheme of work" })).toHaveAttribute("href", "/curriculum?courseId=k2&week=3");
  });

  it("lists the day with rooms, the break, and the now and next tags", () => {
    renderToday();
    const day = screen.getByRole("region", { name: "Your day" });
    expect(within(day).getByText("4 lessons today · 1 taught")).toBeInTheDocument();
    expect(within(day).getByText("Short break")).toBeInTheDocument();
    expect(within(day).getByText("Now · 35 min left")).toBeInTheDocument();
    expect(within(day).getByText("Next")).toBeInTheDocument();
    expect(within(day).getAllByText(/Block B, Room 4/).length).toBeGreaterThan(0);
  });

  it("opens today's register for the class-teacher class", () => {
    renderToday();
    expect(screen.getByTitle("Open today's register for JSS1 A · closes at 11:00")).toHaveAttribute("href", "/attendance/class/c1?date=2026-09-25");
  });

  it("says the register is submitted once it is, and hides it for a subject teacher", () => {
    const submitted = makeTodayFixture();
    submitted.registers[0].submittedAt = "2026-09-25T07:44:00.000Z";
    const { unmount } = render(<TodayView today={submitted} nowMs={NOW} firstName="Seyi" onUpload={jest.fn()} />);
    expect(screen.getByText("✓ Register submitted")).toBeInTheDocument();
    expect(screen.queryByTitle(/Open today's register/)).not.toBeInTheDocument();
    unmount();

    const subjectOnly = makeTodayFixture();
    subjectOnly.registers = [];
    renderToday(subjectOnly);
    expect(screen.queryByTitle(/Open today's register/)).not.toBeInTheDocument();
    expect(screen.queryByText("✓ Register submitted")).not.toBeInTheDocument();
  });

  it("lists what needs attention, each linked to its page", () => {
    renderToday();
    const card = screen.getByRole("region", { name: "Needs your attention" });
    expect(within(card).getByText("5 open")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Open message" })).toHaveAttribute("href", "/messages?room=t1");
    expect(within(card).getByRole("link", { name: "Continue grading" })).toHaveAttribute("href", "/grading?courseId=k1&assessmentId=a1");
    expect(within(card).getByRole("link", { name: "Upload" })).toHaveAttribute("href", "/resources?upload=1&courseId=k1&week=3");
  });

  it("says 'all caught up' when nothing needs attention", () => {
    renderToday({ ...makeTodayFixture(), attention: [] });
    expect(screen.getByText("You are all caught up for today.")).toBeInTheDocument();
  });

  it("shows the setup card and class cards, and the tour step opens the tour", () => {
    const { onTour } = renderToday();
    const setup = screen.getByRole("region", { name: "Finish setting up" });
    expect(within(setup).getByText("50%")).toBeInTheDocument();
    expect(within(setup).getByText("3 of 6 done. Each step takes a minute or two.")).toBeInTheDocument();
    fireEvent.click(within(setup).getByRole("button", { name: /Take the tour/ }));
    expect(onTour).toHaveBeenCalled();

    const jss1 = screen.getByRole("region", { name: "JSS1 A" });
    expect(within(jss1).getByText("Class teacher")).toBeInTheDocument();
    expect(within(jss1).getByText("12 of 30")).toBeInTheDocument();
    expect(within(jss1).getByText("Not submitted")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "JSS2 B" })).queryByText("Today's register")).not.toBeInTheDocument();
  });

  it("hides the setup card at 100%", () => {
    const done = makeTodayFixture();
    done.setup = { percent: 100, steps: done.setup.steps.map((s) => ({ ...s, done: true })) };
    renderToday(done);
    expect(screen.queryByRole("region", { name: "Finish setting up" })).not.toBeInTheDocument();
  });
});

describe("Today as the clock moves", () => {
  it("shows the first lesson before school", () => {
    renderToday(makeTodayFixture(), lagos("07:40"));
    const next = screen.getByRole("region", { name: "Your next lesson" });
    expect(within(next).getByText("First lesson · Period 1")).toBeInTheDocument();
    expect(within(next).getByText("Starts at 8:00 · in 20 min")).toBeInTheDocument();
  });

  it("shows what is next in a free period, and greets the afternoon", () => {
    renderToday(makeTodayFixture(), lagos("12:30"));
    expect(screen.getByRole("heading", { level: 1, name: "Good afternoon, Seyi" })).toBeInTheDocument();
    expect(screen.getByText("Free period · next is Period 7")).toBeInTheDocument();
  });

  it("says the day is done after the last lesson", () => {
    renderToday(makeTodayFixture(), lagos("15:00"));
    expect(screen.getByRole("heading", { name: "That is all your lessons for today" })).toBeInTheDocument();
    expect(screen.getByText("4 lessons taught.")).toBeInTheDocument();
  });
});

describe("Today without lessons", () => {
  it.each([
    ["the weekend", makeWeekendTodayFixture(), "It is the weekend, so there are no lessons today."],
    ["a holiday", makeHolidayTodayFixture("Independence Day"), "Independence Day: the school is closed, so there are no lessons today."],
    ["no current term", makeNoTermTodayFixture(), /There is no current term/],
    ["no lessons today", makeNoLessonsTodayFixture(), "You have no lessons today."],
    ["no timetable at all", makeNoTimetableTodayFixture(), /Your timetable has not been set up yet/],
  ] as const)("explains %s, with no Now card", (_label, today, message) => {
    renderToday(today);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByText("No lessons today")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /lesson on now|next lesson/ })).not.toBeInTheDocument();
  });

  it("still lists the lessons on a day outside the term, with a note and no register button", () => {
    const outside = { ...makeTodayFixture(), term: null, weekNumber: null, attention: [] };
    outside.schoolDay = { isSchoolDay: false, reason: "no_term", holidayTitle: null, endsEarlyAt: null };
    renderToday(outside);
    expect(screen.getByText(/There is no current term today, so registers are not taken/)).toBeInTheDocument();
    expect(screen.queryByText(/There is no current term, so there are no lessons today/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mathematics · JSS1 A ?, Period 1,/ })).toBeInTheDocument();
    expect(screen.queryByTitle(/Open today's register/)).not.toBeInTheDocument();
  });

  it("hides Take register at the weekend", () => {
    const weekend = makeWeekendTodayFixture();
    weekend.registers = makeTodayFixture().registers;
    renderToday(weekend);
    expect(screen.queryByTitle(/Open today's register/)).not.toBeInTheDocument();
  });

  it("warns about an early close", () => {
    const early = makeTodayFixture();
    early.schoolDay = { ...early.schoolDay, endsEarlyAt: "12:20" };
    renderToday(early);
    expect(screen.getByText("School closes early today at 12:20. Lessons after that are cancelled.")).toBeInTheDocument();
  });
});

describe("the lesson sheet", () => {
  beforeEach(() => service.setTaught.mockReset());

  it("opens from the day list with the period, room, topic and actions", async () => {
    renderToday();
    fireEvent.click(screen.getByRole("button", { name: /Mathematics · JSS1 A ?, Period 1,/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Friday · Period 1 · 8:00 – 8:40")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Mathematics · JSS1 A" })).toBeInTheDocument();
    expect(within(dialog).getByText(/12 students · MTH111/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Room: Block B, Room 4/)).toBeInTheDocument();
    expect(within(dialog).getByText("Week 3 topic")).toBeInTheDocument();
    expect(within(dialog).getByText(/^Fractions: types and equivalence\. Students should be able/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("link", { name: "Open" })[0]).toHaveAttribute("href", "/attendance/class/c1?date=2026-09-25");
    expect(within(dialog).getByRole("link", { name: "Message" })).toHaveAttribute("href", "/messages?room=room-c1");
  });

  it("sends Message the class to the inbox when the class has no group room", async () => {
    const today = makeTodayFixture();
    today.lessons = today.lessons.map((l) => ({ ...l, classRoomId: null }));
    renderToday(today);
    fireEvent.click(screen.getByRole("button", { name: /Mathematics · JSS1 A ?, Period 1,/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Message" })).toHaveAttribute("href", "/messages");
  });

  it("offers the register only to the class teacher", async () => {
    renderToday();
    fireEvent.click(screen.getByRole("button", { name: "Open lesson" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Mathematics · JSS2 B" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Take register")).not.toBeInTheDocument();
  });

  it("sends Mark taught for the course, week and term", async () => {
    let resolve: (v: MarkTaughtResponse) => void = () => {};
    service.setTaught.mockImplementation(() => new Promise((r) => (resolve = r)));
    renderToday();
    fireEvent.click(screen.getByRole("button", { name: "Open lesson" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark taught" }));
    await waitFor(() => expect(service.setTaught).toHaveBeenCalledWith("k2", 3, { taught: true, termId: "term-1" }));
    resolve({ week: 3, taughtAt: new Date().toISOString() });
  });

  it("hands Share a resource to the upload flow with the course and week", async () => {
    const { onUpload } = renderToday();
    fireEvent.click(screen.getByRole("button", { name: "Open lesson" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Upload" }));
    expect(onUpload).toHaveBeenCalledWith("k2", 3);
  });
});

describe("TodayScreen", () => {
  beforeEach(() => service.getToday.mockReset());

  it("shows a skeleton, then the day", async () => {
    service.getToday.mockResolvedValue(makeTodayFixture());
    render(<TodayScreen />);
    expect(screen.getByRole("status", { name: "Loading today" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), Ada$/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Needs your attention" })).toBeInTheDocument();
  });

  it("explains a failure and retries", async () => {
    service.getToday.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(makeTodayFixture());
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "We could not load your day" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Needs your attention" })).toBeInTheDocument();
    expect(service.getToday).toHaveBeenCalledTimes(2);
  });
});
