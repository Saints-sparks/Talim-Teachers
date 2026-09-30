/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { GradingScreen, type GradingLink } from "@/components/grading/GradingScreen";
import { gradingService } from "@/app/services/grading/grading.service";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { todayService } from "@/app/services/today/today.service";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import { toast } from "@/components/CustomToast";
import { useTeacherPreferences } from "@/hooks/settings/useTeacherSettings";
import { ApiError, type ApiErrorBody } from "@/lib/apiError";
import { makeMyClassesFixture } from "@/lib/fixtures/classroom.fixture";
import { makeTodayFixture } from "@/lib/fixtures/today.fixture";
import * as fx from "@/lib/fixtures/grading.fixture";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/grading",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/grading/grading.service", () => ({
  gradingService: {
    getSheet: jest.fn(),
    saveScores: jest.fn(),
    publish: jest.fn(),
    unlock: jest.fn(),
    getReadiness: jest.fn(),
    sendReminder: jest.fn(),
    getBroadsheet: jest.fn(),
    getRemarks: jest.fn(),
    saveRemarks: jest.fn(),
    getTermResults: jest.fn(),
    submitTermResults: jest.fn(),
  },
}));
jest.mock("@/app/services/classroom/classroom.service", () => ({
  classroomService: { getMyClasses: jest.fn(), getRegister: jest.fn(), saveRegister: jest.fn(), getRoster: jest.fn(), getStudentRecord: jest.fn() },
}));
jest.mock("@/app/services/today/today.service", () => ({
  todayService: { getToday: jest.fn(), getMyWeek: jest.fn(), setTaught: jest.fn(), completeTour: jest.fn() },
}));
jest.mock("@/app/services/grading-workspace/grading-workspace.service", () => ({ gradingWorkspaceService: { getTerms: jest.fn() } }));
jest.mock("@/hooks/settings/useTeacherSettings", () => ({ useTeacherPreferences: jest.fn() }));

const grading = gradingService as jest.Mocked<typeof gradingService>;
const classroom = classroomService as jest.Mocked<typeof classroomService>;
const today = todayService as jest.Mocked<typeof todayService>;
const workspace = gradingWorkspaceService as jest.Mocked<typeof gradingWorkspaceService>;
const toastMock = toast as unknown as { success: jest.Mock; error: jest.Mock; info: jest.Mock };
const preferences = useTeacherPreferences as jest.Mock;

/**
 * A 409 as the API sends it (`error.code` is always `CONFLICT`; the
 * machine-readable fields sit at the top level) and the client raises it.
 *
 * @param body - Extra top-level fields.
 * @returns The error.
 */
function conflict(body: Record<string, unknown>): ApiError {
  return ApiError.fromResponse(
    { status: 409 },
    { success: false, statusCode: 409, message: "Conflict", error: { code: "CONFLICT", message: "Conflict" }, ...body } as ApiErrorBody,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fx.resetGradingFixtureStore();
  classroom.getMyClasses.mockResolvedValue(makeMyClassesFixture());
  today.getToday.mockResolvedValue(makeTodayFixture());
  workspace.getTerms.mockResolvedValue(fx.makeTermsFixture());
  preferences.mockReturnValue({ preferences: { teaching: { gradingView: "course" }, guides: { showAppTips: false } }, isLoading: false });
  grading.getSheet.mockImplementation(async (courseId, termId) => fx.makeCourseSheetFixture(courseId, termId));
  grading.saveScores.mockImplementation(async (courseId, assessmentId, body) => fx.saveScoresFixture(courseId, assessmentId, body));
  grading.publish.mockImplementation(async (courseId, assessmentId) => fx.publishFixture(courseId, assessmentId));
  grading.unlock.mockImplementation(async (courseId, assessmentId) => fx.unlockFixture(courseId, assessmentId));
  grading.getReadiness.mockImplementation(async (classId) => fx.makeReadinessFixture(classId));
  grading.sendReminder.mockImplementation(async (classId, body) => fx.sendReminderFixture(classId, body));
  grading.getBroadsheet.mockImplementation(async (classId, basis) => fx.makeBroadsheetFixture(classId, basis));
  grading.getRemarks.mockImplementation(async (classId) => fx.makeRemarksFixture(classId));
  grading.saveRemarks.mockImplementation(async (classId, body) => fx.saveRemarksFixture(classId, body));
  grading.getTermResults.mockImplementation(async (classId) => fx.makeTermResultsFixture(classId));
  grading.submitTermResults.mockImplementation(async (classId, body) => fx.submitTermResultsFixture(classId, body.basis));
});

/**
 * Renders the page for a link.
 *
 * @param link - What the address asks for.
 * @returns The render result.
 */
function open(link: GradingLink = {}) {
  return render(<GradingScreen link={link} />);
}

/**
 * The score input of a student on the single-assessment sheet.
 *
 * @param name - The student.
 * @param assessment - "1st CA".
 * @param max - Out of.
 * @returns The input.
 */
const scoreInput = (name: string, assessment = "1st CA", max = 20) =>
  screen.getByRole("textbox", { name: `Score for ${name}, ${assessment}, out of ${max}` }) as HTMLInputElement;

/**
 * Opens JSS1 A Mathematics on the 1st CA.
 *
 * @returns Nothing.
 */
async function openMaths() {
  open();
  await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" });
}

describe("Subject scores", () => {
  it("opens the first subject on its first unpublished assessment, with tabs from the API and the Term total", async () => {
    await openMaths();
    const chips = screen.getByRole("group", { name: "Subject" });
    expect(within(chips).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Mathematics · JSS1 A",
      "Mathematics · JSS2 B",
      "Further Mathematics · JSS2 B",
    ]);
    const tabs = screen.getByRole("group", { name: "Assessment" });
    expect(within(tabs).getByRole("button", { name: /^1st CA/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(tabs).getByText("Draft · 8/12")).toBeInTheDocument();
    expect(within(tabs).getByText("Out of 20 · due Fri 2 Oct")).toBeInTheDocument();
    expect(within(tabs).getByText("Out of 60 · due Fri 4 Dec")).toBeInTheDocument();
    expect(within(tabs).getByText("1st CA + 2nd CA + Exam = 100")).toBeInTheDocument();
    expect(within(tabs).getByText("0/12 complete")).toBeInTheDocument();
    expect(screen.getByText("Draft saved yesterday at 4:12pm. Only you can see it.")).toBeInTheDocument();
    expect(screen.getByText("8 / 12")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total /100" })).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/grading?courseId=k1&assessmentId=a1", { scroll: false }));
  });

  it("strips non-numbers, flags a score above the maximum, and keeps Save and Publish off until they can work", async () => {
    await openMaths();
    const save = screen.getByRole("button", { name: "Save draft" });
    const publish = screen.getByRole("button", { name: "Publish scores" });
    expect(save).toBeDisabled();
    expect(publish).toBeDisabled();

    fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "2a5" } });
    expect(scoreInput("Emeka Nnaji").value).toBe("25");
    expect(scoreInput("Emeka Nnaji")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Above 20")).toBeInTheDocument();
    expect(screen.getByText("1 score is above the maximum of 20 or not a number.")).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "12" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(save).toBeEnabled();
    expect(publish).toBeDisabled();

    for (const name of ["Funmi Adeyemi", "Samuel Ogun", "Zainab Yusuf"]) fireEvent.change(scoreInput(name), { target: { value: "10" } });
    expect(publish).toBeEnabled();
    expect(screen.getByText("12 / 12")).toBeInTheDocument();
  });

  it("saves only the changed scores as a draft, including a cleared one", async () => {
    await openMaths();
    fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear the score for Musa Adele" }));
    expect(scoreInput("Musa Adele").value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Draft saved. Students and parents cannot see it yet."));
    expect(grading.saveScores).toHaveBeenCalledWith("k1", "a1", {
      scores: [
        { studentId: "s10", score: 12 },
        { studentId: "s1", score: null },
      ],
    });
    expect(await screen.findByText("Draft saved today at 10:25am. Only you can see it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("walks down the column with Enter", async () => {
    await openMaths();
    const first = scoreInput("Aisha Bello");
    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    expect(document.activeElement).toBe(scoreInput("Chiamaka Obi"));
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter", shiftKey: true });
    expect(document.activeElement).toBe(first);
  });

  it("publishes after a confirm that quotes the design, saving first, and reports who was notified", async () => {
    await openMaths();
    for (const name of ["Emeka Nnaji", "Funmi Adeyemi", "Samuel Ogun", "Zainab Yusuf"]) fireEvent.change(scoreInput(name), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish scores" }));
    const dialog = await screen.findByRole("dialog", { name: "Publish 1st CA for Mathematics · JSS1 A?" });
    expect(
      within(dialog).getByText(
        "Students and their parents will see these 12 scores in their portals and receive a notification. Scores lock once published; you can unlock them to correct a mistake.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish scores" }));
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("1st CA published. Students and parents can see the scores; 24 people notified."),
    );
    expect(grading.saveScores).toHaveBeenCalledTimes(1);
    expect(grading.publish).toHaveBeenCalledWith("k1", "a1");
    expect(await screen.findByRole("button", { name: "Unlock to correct" })).toBeInTheDocument();
    expect(scoreInput("Aisha Bello")).toBeDisabled();
  });

  it("says how many are missing when the server refuses a publish (409 missing: student ids)", async () => {
    grading.publish.mockRejectedValueOnce(conflict({ missing: ["s3", "s7"] }));
    await openMaths();
    for (const name of ["Emeka Nnaji", "Funmi Adeyemi", "Samuel Ogun", "Zainab Yusuf"]) fireEvent.change(scoreInput(name), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish scores" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publish scores" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("2 students still need a score before you can publish 1st CA."));
  });

  it("drops changes to scores that were locked meanwhile (409 LOCKED) and reloads", async () => {
    grading.saveScores.mockRejectedValueOnce(conflict({ code: "LOCKED" }));
    await openMaths();
    fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("1st CA is published and locked, so your changes were not saved. Unlock it to correct a score."),
    );
    expect(scoreInput("Emeka Nnaji").value).toBe("");
    expect(grading.getSheet).toHaveBeenCalledTimes(2);
  });

  it("unlocks published scores to correct them, after a confirm", async () => {
    open({ courseId: "k2", assessmentId: "a1" });
    await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS2 B · out of 20" });
    expect(screen.getByText("Published 18 Sep. Locked and visible to students and parents.")).toBeInTheDocument();
    expect(scoreInput("Blessing Akpan")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish scores" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unlock to correct" }));
    const dialog = await screen.findByRole("dialog", { name: "Unlock 1st CA for Mathematics · JSS2 B?" });
    expect(within(dialog).getByText("Scores become editable again. When you republish, students and parents are told which scores changed.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Reason (optional)"), { target: { value: "Two scripts marked twice" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("1st CA unlocked for editing."));
    expect(grading.unlock).toHaveBeenCalledWith("k2", "a1", { reason: "Two scripts marked twice" });
    await waitFor(() => expect(scoreInput("Blessing Akpan")).toBeEnabled());
  });

  it("shows every assessment side by side on the Term total, with positions and published columns locked", async () => {
    open({ courseId: "k2", assessmentId: "total" });
    await screen.findByRole("heading", { name: "Term total · Mathematics · JSS2 B · out of 100" });
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["#", "Student", "1st CA", "2nd CA", "Exam", "Total", "Grade", "Pos.", "Status"]);
    expect(within(table).getAllByText("Complete")).toHaveLength(10);
    expect(screen.getByRole("textbox", { name: "Score for Blessing Akpan, 1st CA, out of 20" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Score for Blessing Akpan, Exam, out of 60" })).toBeEnabled();
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
    expect(within(table).getAllByText(/^Joint |^\d+(st|nd|rd|th) of 10$/).length).toBe(10);
    expect(screen.getByText("1st CA published · 2nd CA published · Exam draft 10/10")).toBeInTheDocument();
  });

  it("fills in scores from a CSV file without saving them", async () => {
    await openMaths();
    const file = new File(["Student,Score\nEmeka Nnaji,17\nNobody,4"], "scores.csv", { type: "text/csv" });
    fireEvent.change(screen.getByTestId("score-csv-input"), { target: { files: [file] } });
    await waitFor(() => expect(scoreInput("Emeka Nnaji").value).toBe("17"));
    expect(toastMock.success).toHaveBeenCalledWith("Filled in 1 score from scores.csv. Check them, then Save draft.");
    expect(screen.getByRole("alert")).toHaveTextContent("Row 3: no student in this class matches “Nobody”.");
    expect(grading.saveScores).not.toHaveBeenCalled();
  });

  it("asks before leaving the page with unsaved scores", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <GradingScreen link={{}} />
        <a href="/students" onClick={(event) => event.preventDefault()}>
          Students
        </a>
      </>,
    );
    await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" });
    fireEvent.click(screen.getByRole("link", { name: "Students" }));
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "12" } });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    screen.getByRole("link", { name: "Students" }).dispatchEvent(click);
    expect(confirm).toHaveBeenCalledWith("You have unsaved scores. Leave this page and lose them?");
    expect(click.defaultPrevented).toBe(true);
    confirm.mockRestore();
  });

  it("guards the browser's Back while scores are unsaved, and stops asking once they are saved", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    const router = jest.fn();
    window.history.replaceState({ __NA: true, page: "dashboard" }, "", "/dashboard");
    window.history.pushState({ __NA: true, page: "grading" }, "", "/grading");
    const length = window.history.length;
    window.addEventListener("popstate", router);
    // Wait for jsdom's popstate itself (slower under a parallel run), then for a guard that puts the entry back.
    const back = () =>
      act(async () => {
        const popped = new Promise<void>((resolve) => {
          window.addEventListener("popstate", () => resolve(), { once: true });
          setTimeout(resolve, 2000);
        });
        window.history.back();
        await popped;
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    try {
      render(
        <>
          <GradingScreen link={{}} />
          <a href="/students" onClick={(event) => event.preventDefault()}>
            Students
          </a>
        </>,
      );
      await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" });
      fireEvent.change(scoreInput("Emeka Nnaji"), { target: { value: "12" } });

      await back();
      expect(confirm).toHaveBeenCalledWith("You have unsaved scores. Leave this page and lose them?");
      expect(router).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe("/grading");
      expect(window.history.length).toBe(length);
      expect(scoreInput("Emeka Nnaji").value).toBe("12");

      fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Draft saved. Students and parents cannot see it yet."));
      // The toast can land before the saved sheet re-renders; wait until nothing is left to save, so the guard is off.
      await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled());
      confirm.mockClear();
      fireEvent.click(screen.getByRole("link", { name: "Students" }));
      await back();
      expect(confirm).not.toHaveBeenCalled();
      expect(router).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe("/dashboard");
    } finally {
      window.removeEventListener("popstate", router);
      confirm.mockRestore();
    }
  });
});

describe("Grading states", () => {
  it("shows a loading state while the classes load", () => {
    classroom.getMyClasses.mockReturnValue(new Promise(() => undefined));
    open();
    expect(screen.getByRole("status", { name: "Loading grading" })).toBeInTheDocument();
  });

  it("says there is nothing to grade for a teacher with no subjects or classes", async () => {
    classroom.getMyClasses.mockResolvedValue([]);
    open();
    expect(await screen.findByRole("heading", { name: "Nothing to grade yet" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Grading view" })).not.toBeInTheDocument();
  });

  it("offers a retry when the classes cannot be read", async () => {
    classroom.getMyClasses.mockRejectedValue(new Error("offline"));
    open();
    expect(await screen.findByRole("heading", { name: "We could not load your classes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("says a linked subject is not the teacher's (403)", async () => {
    open({ courseId: "zz9" });
    expect(await screen.findByRole("heading", { name: "Not one of your subjects" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("says when a term has no assessments", async () => {
    open({ courseId: "k1", termId: "term-0" });
    expect(await screen.findByRole("heading", { name: "No assessments in Third term" })).toBeInTheDocument();
  });

  it("hides the class report for a subject teacher", async () => {
    classroom.getMyClasses.mockResolvedValue(makeMyClassesFixture().filter((c) => c.role !== "class_teacher"));
    preferences.mockReturnValue({ preferences: { teaching: { gradingView: "class" }, guides: { showAppTips: false } }, isLoading: false });
    open();
    await screen.findByRole("heading", { name: "Exam · Mathematics · JSS2 B · out of 60" });
    expect(screen.queryByRole("group", { name: "Grading view" })).not.toBeInTheDocument();
  });

  it("says why a class report link does not open for a class the teacher is not class teacher of", async () => {
    open({ mode: "class", classId: "c2" });
    expect(await screen.findByRole("heading", { name: "Only the class teacher compiles the class report" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open subject scores" }));
    expect(await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" })).toBeInTheDocument();
  });
});

describe("Class report", () => {
  /**
   * Opens JSS1 A's class report.
   *
   * @param link - Extra link fields.
   * @returns Nothing.
   */
  async function openReport(link: GradingLink = {}) {
    open({ mode: "class", classId: "c1", ...link });
    await screen.findByRole("group", { name: "Class report for JSS1 A" });
  }

  it("opens from the preference, with the class in the mode switch", async () => {
    preferences.mockReturnValue({ preferences: { teaching: { gradingView: "class" }, guides: { showAppTips: false } }, isLoading: false });
    open();
    expect(await screen.findByRole("heading", { name: "JSS1 A · report readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Class report · JSS1 A" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/grading?mode=class&classId=c1", { scroll: false }));
  });

  it("offers a class picker when the teacher is class teacher of several classes", async () => {
    const [c1, c2] = makeMyClassesFixture();
    classroom.getMyClasses.mockResolvedValue([c1, { ...c2, role: "class_teacher" }]);
    await openReport();
    await screen.findByRole("heading", { name: "JSS1 A · report readiness" });
    const picker = screen.getByRole("group", { name: "Class" });
    expect(within(picker).getAllByRole("button").map((b) => b.textContent)).toEqual(["JSS1 A", "JSS2 B"]);
  });

  it("lists each subject's status per assessment, Open on the teacher's own and Send reminder on a colleague's", async () => {
    await openReport();
    const table = await screen.findByRole("table");
    const english = within(table).getByRole("row", { name: /English Language/ });
    expect(within(english).getByText("Mrs. Adaeze Okoro")).toBeInTheDocument();
    expect(within(english).getByText("Published")).toBeInTheDocument();
    const remind = within(english).getByRole("button", { name: "Send reminder" });
    expect(remind).toHaveAttribute("title", "Message Mrs. Adaeze Okoro about the 2nd CA deadline");
    fireEvent.click(remind);
    await waitFor(() => expect(within(english).getByText("Reminder sent")).toBeInTheDocument());
    expect(grading.sendReminder).toHaveBeenCalledWith("c1", { courseId: "o1", assessmentId: "a2" });
    expect(toastMock.success).toHaveBeenCalledWith("Reminder sent to Mrs. Adaeze Okoro about 2nd CA scores.");

    const maths = within(table).getByRole("row", { name: /Mathematics/ });
    expect(within(maths).getByText("You")).toBeInTheDocument();
    fireEvent.click(within(maths).getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("heading", { name: "1st CA · Mathematics · JSS1 A · out of 20" })).toBeInTheDocument();
  });

  it("treats a 409 ALREADY_REMINDED as already sent today", async () => {
    grading.sendReminder.mockRejectedValueOnce(conflict({ code: "ALREADY_REMINDED", sentAt: "2026-09-25T08:00:00.000Z" }));
    await openReport();
    const science = await screen.findByRole("row", { name: /Basic Science/ });
    fireEvent.click(within(science).getByRole("button", { name: "Send reminder" }));
    await waitFor(() => expect(within(science).getByText("Reminder sent")).toBeInTheDocument());
    expect(toastMock.info).toHaveBeenCalledWith("A reminder about 2nd CA was already sent to Mr. Tunji Salami today.");
  });

  it("does not claim a reminder went out when the scores were published meanwhile (409 PUBLISHED)", async () => {
    grading.sendReminder.mockRejectedValueOnce(conflict({ code: "PUBLISHED" }));
    await openReport();
    const science = await screen.findByRole("row", { name: /Basic Science/ });
    fireEvent.click(within(science).getByRole("button", { name: "Send reminder" }));
    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith("2nd CA scores are already published, so no reminder was needed."));
    expect(within(science).queryByText("Reminder sent")).not.toBeInTheDocument();
    expect(grading.getReadiness.mock.calls.length).toBeGreaterThan(1);
  });

  it("previews the broadsheet until every subject publishes, then generates and shows it is with the office", async () => {
    await openReport();
    await screen.findByRole("heading", { name: "JSS1 A · report readiness" });
    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    expect(await screen.findByRole("heading", { name: "JSS1 A · 1st CA broadsheet" })).toBeInTheDocument();
    expect(screen.getByText("Each subject out of 20. Scores below 45% are shown in red.")).toBeInTheDocument();
    expect(screen.getByText("Preview only. Waiting on Mathematics (yours), Social Studies. Gaps show as dashes until they publish.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate 1st CA summary" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Summary basis" })).toHaveTextContent("1st CA2nd CAExamTerm total");
    expect(document.querySelectorAll("td.text-tl-danger").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "A to Z" }));
    const names = within(screen.getByRole("table")).getAllByRole("rowheader").map((c) => c.querySelector("div")?.textContent);
    expect(names).toEqual([...names].sort((a, b) => (a ?? "").localeCompare(b ?? "")));
  });

  it("generates the summary when ready and shows the submission's status", async () => {
    fx.setOtherSubjectStatusFixture("o3", "a1", "published");
    const sheet = fx.makeCourseSheetFixture("k1");
    fx.saveScoresFixture("k1", "a1", { scores: sheet.students.map((s) => ({ studentId: s.id, score: 12 })) });
    fx.publishFixture("k1", "a1");
    await openReport({ tab: "summary" });
    expect(await screen.findByText("Every subject has published 1st CA scores. Generate the summary to rank the class and send it to the school office.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate 1st CA summary" }));
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("1st CA summary for JSS1 A generated. It is now in the school office's report queue."),
    );
    expect(grading.submitTermResults).toHaveBeenCalledWith("c1", { basis: "a1" });
    expect(await screen.findByText(/^Submitted to the school office/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate 1st CA summary" })).not.toBeInTheDocument();
  });

  it("shows a returned summary with the office's reason and lets the teacher submit again", async () => {
    fx.setTermResultFixture("a1", "returned", "Check Musa's position");
    await openReport({ tab: "summary" });
    expect(await screen.findByText(/Returned by the school office today at 9:00am: “Check Musa's position”/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit 1st CA summary again" })).toBeDisabled();
  });

  it("autosaves remarks and shows the principal's remark read-only", async () => {
    await openReport({ tab: "remarks" });
    const box = (await screen.findByRole("textbox", { name: "Remark for Jaye Femi" })) as HTMLTextAreaElement;
    expect(screen.getByText("A pleasure to have in the school. Keep it up.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Remark for Musa Adele" })).toHaveValue("A careful worker. Should read more widely.");
    fireEvent.change(box, { target: { value: "Asks good questions." } });
    expect(box).toHaveValue("Asks good questions.");
    expect(screen.getByText("20/500")).toBeInTheDocument();
    await waitFor(() => expect(grading.saveRemarks).toHaveBeenCalledWith("c1", { remarks: [{ studentId: "s2", classTeacherRemark: "Asks good questions." }] }), { timeout: 2000 });
    expect(await screen.findByText("All remarks saved")).toBeInTheDocument();
  });

  it("locks remarks while the results are with the school office", async () => {
    fx.setTermResultFixture("total", "submitted");
    await openReport({ tab: "remarks" });
    const box = await screen.findByRole("textbox", { name: "Remark for Jaye Femi" });
    expect(box).toHaveAttribute("readonly");
    expect(screen.getByText("Remarks are locked while the term results are with the school office. If the office returns them, you can edit again.")).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "x" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
    expect(grading.saveRemarks).not.toHaveBeenCalled();
  });
});
