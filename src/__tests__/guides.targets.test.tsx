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
import { findGuideConfig, guideConfigFor, guideConfigs } from "@/components/onboarding/guideSteps";
import AppGuide from "@/components/onboarding/AppGuide";
import { TOUR_STEPS } from "@/components/tour/TourProvider";
import { TodayView } from "@/components/today/TodayView";
import { TimetableView } from "@/components/timetable/TimetableView";
import { AttendanceScreen } from "@/components/attendance/AttendanceScreen";
import { StudentsScreen } from "@/components/students/StudentsScreen";
import { StudentRecordScreen } from "@/components/students/StudentRecordScreen";
import { GradingScreen } from "@/components/grading/GradingScreen";
import { SubjectsScreen } from "@/components/subjects/SubjectsScreen";
import { AttendanceHistoryScreen } from "@/components/attendance/AttendanceHistoryScreen";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { gradingService } from "@/app/services/grading/grading.service";
import { subjectsService } from "@/app/services/subjects/subjects.service";
import * as gradingFixture from "@/lib/fixtures/grading.fixture";
import * as subjectsFixture from "@/lib/fixtures/subjects.fixture";
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
let search = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getRoster: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));
jest.mock("@/app/services/grading/grading.service", () => ({
  gradingService: {
    getSheet: jest.fn(),
    getReadiness: jest.fn(),
    getTermResults: jest.fn(),
    getBroadsheet: jest.fn(),
    getRemarks: jest.fn(),
  },
}));
jest.mock("@/app/services/subjects/subjects.service", () => ({
  shouldRecordResourceView: () => false,
  subjectsService: { getMySubjects: jest.fn(), getScheme: jest.fn(), getCourseResources: jest.fn(), getLegacyCurriculum: jest.fn() },
}));
jest.mock("@/hooks/academic/useSchoolTerms", () => ({ useSchoolTerms: () => ({ data: [] }) }));
jest.mock("@/app/services/attendance/attendance.service", () => ({ attendanceService: { getStudentKpis: jest.fn() } }));
jest.mock("@/app/services/api.service", () => ({
  ...jest.requireActual("@/app/services/api.service"),
  getCurrentTerm: jest.fn().mockResolvedValue({ _id: "t1", name: "First Term", startDate: "2026-09-07" }),
}));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: () => ({ user: { userId: "teacher-1" } }) }));
jest.mock("@/hooks/settings/useTeacherSettings", () => ({ useTeacherPreferences: jest.fn() }));

const classroom = classroomService as jest.Mocked<typeof classroomService>;
const today = todayService as jest.Mocked<typeof todayService>;
const preferences = useTeacherPreferences as jest.Mock;
const grading = gradingService as jest.Mocked<typeof gradingService>;
const subjects = subjectsService as jest.Mocked<typeof subjectsService>;

beforeAll(() => {
  // jsdom has no layout; the guide scrolls its target into view.
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  search = "";
  resetClassroomFixtureStore();
  localStorage.clear();
  classroom.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  classroom.getRegister.mockImplementation(async (classId, date) => makeRegisterFixture(classId, date));
  classroom.getRoster.mockImplementation(async (classId) => makeRosterFixture(classId));
  classroom.getStudentRecord.mockImplementation(async (id) => makeStudentRecordFixture(id)!);
  today.getToday.mockResolvedValue(makeTodayFixture());
  preferences.mockReturnValue({ preferences: { guides: { showAppTips: true } }, isLoading: false });
  gradingFixture.resetGradingFixtureStore();
  subjectsFixture.resetSubjectsFixtureStore();
  grading.getSheet.mockImplementation(async (courseId, termId) => gradingFixture.makeCourseSheetFixture(courseId, termId));
  grading.getReadiness.mockImplementation(async (classId) => gradingFixture.makeReadinessFixture(classId));
  grading.getTermResults.mockImplementation(async (classId) => gradingFixture.makeTermResultsFixture(classId));
  grading.getBroadsheet.mockImplementation(async (classId, basis) => gradingFixture.makeBroadsheetFixture(classId, basis));
  grading.getRemarks.mockImplementation(async (classId) => gradingFixture.makeRemarksFixture(classId));
  subjects.getMySubjects.mockImplementation(async (termId) => subjectsFixture.makeSubjectCardsFixture(termId));
  subjects.getScheme.mockImplementation(async (courseId, termId) => subjectsFixture.makeSchemeFixture(courseId, termId)!);
  subjects.getCourseResources.mockImplementation(async (courseId) => subjectsFixture.makeCourseResourcesFixture(courseId));
  (attendanceService.getStudentKpis as jest.Mock).mockImplementation(async (studentId: string) => ({
    studentId,
    firstName: "F",
    lastName: "L",
    email: "",
    attendanceRate: 0,
    totalDays: 12,
    presentDays: 10,
    lateDays: 1,
    absentDays: 1,
    excusedDays: 0,
  }));
});

/** Each redesigned page: its path (and query), the guide expected there, and how to render it ready. */
const PAGES: { path: string; query?: string; guide: string; mount: () => Promise<void> }[] = [
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
    path: "/analytics/attendance",
    guide: "attendance-history",
    mount: async () => {
      render(<AttendanceHistoryScreen initial={{}} />);
      await screen.findByRole("table");
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
  {
    path: "/grading",
    guide: "grading",
    mount: async () => {
      render(<GradingScreen link={{}} />);
      await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" });
    },
  },
  {
    path: "/grading",
    query: "mode=class&classId=c1",
    guide: "grading-class",
    mount: async () => {
      render(<GradingScreen link={{ mode: "class", classId: "c1" }} />);
      await screen.findByRole("heading", { name: "JSS1 A · report readiness" });
    },
  },
  {
    path: "/subjects",
    guide: "subjects",
    mount: async () => {
      render(<SubjectsScreen />);
      await screen.findByRole("list", { name: /Weeks of the scheme of work/ });
    },
  },
];

describe.each(PAGES)("the $guide guide on $path", ({ path, query, guide, mount }) => {
  it(`is the '${guide}' guide and every target is on the page`, async () => {
    const config = guideConfigFor(path, new URLSearchParams(query ?? ""));
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
  it("covers the redesigned pages, and every step links to a page with a guide or its own screen", () => {
    const hrefs = TOUR_STEPS.map((s) => s.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/dashboard", "/attendance", "/students", "/timetable", "/grading", "/grading?mode=class", "/subjects"]));
    for (const href of hrefs) {
      const url = new URL(href, "http://talim.test");
      expect(guideConfigFor(url.pathname, url.searchParams)).toBeDefined();
    }
    expect(guideConfigFor("/grading", new URLSearchParams("mode=class"))?.id).toBe("grading-class");
    expect(findGuideConfig("/grading")?.id).toBe("grading");
    expect(TOUR_STEPS.find((s) => s.href === "/students")?.linkLabel).toBe("Open Students");
    expect(TOUR_STEPS.find((s) => s.href === "/grading?mode=class")?.title).toBe("Class report, as class teacher");
    expect(TOUR_STEPS.find((s) => s.href === "/subjects")?.body).toMatch(/week-by-week scheme of work/);
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

  it("waits for the data before opening, so steps whose targets come with it are not skipped", async () => {
    pathname = "/attendance";
    let release: () => void = () => undefined;
    (classroomService.getRegister as jest.Mock).mockImplementation(
      (classId: string, date?: string) => new Promise((resolve) => (release = () => resolve(makeRegisterFixture(classId, date)))),
    );
    render(
      <>
        <AttendanceScreen />
        <AppGuide />
      </>,
    );
    // The class picker is up but the register is still loading: no guide yet.
    await screen.findByLabelText("Class");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(screen.queryByText(/^Step 1 of/)).not.toBeInTheDocument();
    await act(async () => release());
    expect(await screen.findByText("Step 1 of 5", undefined, { timeout: 3_000 })).toBeInTheDocument();
  });

  it("opens the class report's own guide on /grading?mode=class", async () => {
    pathname = "/grading";
    search = "mode=class&classId=c1";
    render(
      <>
        <GradingScreen link={{ mode: "class", classId: "c1" }} />
        <AppGuide />
      </>,
    );
    await screen.findByRole("heading", { name: "JSS1 A · report readiness" });
    expect(await screen.findByRole("dialog", { name: "Your class, as class teacher" }, { timeout: 3_000 })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("stays closed once the guide has been seen on this device", async () => {
    localStorage.setItem("talim_teacher_guide:teacher-1:students:seen", "done");
    await mountStudentsWithGuide();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
