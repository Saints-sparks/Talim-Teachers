/**
 * @jest-environment jsdom
 *
 * Every per-page guide must point at elements that exist on the page it runs
 * on, so a redesign cannot silently leave a guide spotlighting nothing. Each
 * redesigned page is rendered against the fixtures and every `data-guide`
 * target of the guide for its path is looked up.
 */
import React from "react";
import { act, render, screen } from "@/test-utils/render";
import { findGuideConfig, guideConfigs } from "@/components/onboarding/guideSteps";
import AppGuide from "@/components/onboarding/AppGuide";
import { TOUR_STEPS } from "@/components/tour/TourProvider";
import { TodayView } from "@/components/today/TodayView";
import { TimetableView } from "@/components/timetable/TimetableView";
import { AttendanceScreen } from "@/components/attendance/AttendanceScreen";
import { StudentsScreen } from "@/components/students/StudentsScreen";
import { StudentRecordScreen } from "@/components/students/StudentRecordScreen";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { todayService } from "@/app/services/today/today.service";
import { FIXTURE_NOW, makeTimetableWeekFixture, makeTodayFixture } from "@/lib/fixtures/today.fixture";
import {
  makeMyClassesFixture,
  makeRegisterFixture,
  makeRosterFixture,
  makeStudentRecordFixture,
  resetClassroomFixtureStore,
} from "@/lib/fixtures/classroom.fixture";
import { useTeacherPreferences } from "@/hooks/settings/useTeacherSettings";

let pathname = "/dashboard";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/components/resources/uploadmodal", () => ({ UploadModal: () => null }));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getRoster: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: () => ({ user: { userId: "teacher-1" } }) }));
jest.mock("@/hooks/settings/useTeacherSettings", () => ({ useTeacherPreferences: jest.fn() }));

const classroom = classroomService as jest.Mocked<typeof classroomService>;
const today = todayService as jest.Mocked<typeof todayService>;
const preferences = useTeacherPreferences as jest.Mock;

beforeAll(() => {
  // jsdom has no layout; the guide scrolls its target into view.
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  resetClassroomFixtureStore();
  localStorage.clear();
  classroom.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  classroom.getRegister.mockImplementation(async (classId, date) => makeRegisterFixture(classId, date));
  classroom.getRoster.mockImplementation(async (classId) => makeRosterFixture(classId));
  classroom.getStudentRecord.mockImplementation(async (id) => makeStudentRecordFixture(id)!);
  today.getToday.mockResolvedValue(makeTodayFixture());
  preferences.mockReturnValue({ preferences: { guides: { showAppTips: true } }, isLoading: false });
});

/** Each redesigned page: its path, the guide expected there, and how to render it ready. */
const PAGES: { path: string; guide: string; mount: () => Promise<void> }[] = [
  {
    path: "/dashboard",
    guide: "today",
    mount: async () => {
      render(<TodayView today={makeTodayFixture()} nowMs={Date.parse(FIXTURE_NOW)} firstName="Seyi" onUpload={jest.fn()} onTour={jest.fn()} />);
    },
  },
  {
    path: "/timetable",
    guide: "timetable",
    mount: async () => {
      render(
        <TimetableView
          week={makeTimetableWeekFixture()}
          nowMs={Date.parse(FIXTURE_NOW)}
          mode="week"
          onMode={jest.fn()}
          onWeek={jest.fn()}
          onExportCsv={jest.fn()}
          onPrint={jest.fn()}
          onShareResource={jest.fn()}
        />,
      );
    },
  },
  {
    path: "/attendance",
    guide: "attendance",
    mount: async () => {
      render(<AttendanceScreen />);
      await screen.findByRole("heading", { name: "JSS1 A · Friday 25 September · today" });
    },
  },
  {
    path: "/attendance/class/c1",
    guide: "attendance-class",
    mount: async () => {
      render(<AttendanceScreen initialClassId="c1" initialDate="2026-09-25" />);
      await screen.findByRole("heading", { name: "JSS1 A · Friday 25 September · today" });
    },
  },
  {
    path: "/students",
    guide: "students",
    mount: async () => {
      render(<StudentsScreen />);
      await screen.findByText("12 of 30");
    },
  },
  {
    path: "/students/s1",
    guide: "student-profile",
    mount: async () => {
      render(<StudentRecordScreen studentId="s1" />);
      await screen.findByRole("heading", { level: 1, name: "Musa Adele" });
    },
  },
];

describe.each(PAGES)("guide on $path", ({ path, guide, mount }) => {
  it(`is the '${guide}' guide and every target is on the page`, async () => {
    const config = findGuideConfig(path);
    expect(config?.id).toBe(guide);
    await mount();
    const missing = config!.steps.map((s) => s.target).filter((t) => !document.querySelector(`[data-guide="${t}"]`));
    expect(missing).toEqual([]);
  });
});

describe("guide configs", () => {
  it("have unique ids and no duplicate targets within a guide", () => {
    const ids = guideConfigs.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of guideConfigs) expect(new Set(g.steps.map((s) => s.target)).size).toBe(g.steps.length);
  });
});

describe("portal tour", () => {
  it("covers Attendance and Students, and every step links to a page with a guide or its own screen", () => {
    const hrefs = TOUR_STEPS.map((s) => s.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/dashboard", "/attendance", "/students", "/timetable"]));
    for (const href of ["/dashboard", "/attendance", "/students", "/timetable"]) expect(findGuideConfig(href)).toBeDefined();
    expect(TOUR_STEPS.find((s) => s.href === "/students")?.linkLabel).toBe("Open Students");
  });
});

describe("AppGuide", () => {
  /**
   * Renders the students page with the guide over it.
   *
   * @returns Nothing.
   */
  async function mountStudentsWithGuide() {
    pathname = "/students";
    render(
      <>
        <StudentsScreen />
        <AppGuide />
      </>,
    );
    await screen.findByText("12 of 30");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  it("opens itself on a page's first visit once the targets have rendered", async () => {
    await mountStudentsWithGuide();
    expect(await screen.findByRole("dialog", { name: "One tab per class" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("stays closed when 'Show app guide tips' is off, but the Guide button still opens it", async () => {
    preferences.mockReturnValue({ preferences: { guides: { showAppTips: false } }, isLoading: false });
    await mountStudentsWithGuide();
    expect(screen.queryByRole("dialog", { name: "One tab per class" })).not.toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "Guide" }).click());
    expect(screen.getByRole("dialog", { name: "One tab per class" })).toBeInTheDocument();
  });

  it("stays closed once the guide has been seen on this device", async () => {
    localStorage.setItem("talim_teacher_guide:teacher-1:students:seen", "done");
    await mountStudentsWithGuide();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
