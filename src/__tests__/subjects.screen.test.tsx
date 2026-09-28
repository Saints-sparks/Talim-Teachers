/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { mockTeacherMustChangePassword } from "@/test-utils/render";
import { SubjectsScreen } from "@/components/subjects/SubjectsScreen";
import { subjectsService } from "@/app/services/subjects/subjects.service";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import {
  createResourceFixture,
  makeCourseResourcesFixture,
  makeLegacyCurriculumFixture,
  makeNoResourcesFixture,
  makeNoSubjectsFixture,
  makeSchemeFixture,
  makeSubjectCardsFixture,
  removeResourceFixture,
  resetSubjectsFixtureStore,
  saveSchemeWeekFixture,
  setWeekTaughtFixture,
} from "@/lib/fixtures/subjects.fixture";

const push = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/subjects",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock("@/hooks/academic/useSchoolTerms", () => ({
  useSchoolTerms: () => ({
    data: [
      { _id: "term-1", name: "First term", isActive: true, academicYearName: "2026/2027" },
      { _id: "term-0", name: "Third term", isActive: false, academicYearName: "2025/2026" },
    ],
  }),
}));
jest.mock("@/app/services/subjects/subjects.service", () => ({
  shouldRecordResourceView: jest.requireActual("@/app/services/subjects/subjects.service").shouldRecordResourceView,
  subjectsService: {
    getMySubjects: jest.fn(),
    getScheme: jest.fn(),
    saveWeek: jest.fn(),
    setTaught: jest.fn(),
    getCourseResources: jest.fn(),
    uploadFile: jest.fn(),
    createResource: jest.fn(),
    removeResource: jest.fn(),
    recordResourceView: jest.fn(),
    getLegacyCurriculum: jest.fn(),
  },
}));

const service = subjectsService as jest.Mocked<typeof subjectsService>;
const toastMock = toast as jest.Mocked<typeof toast>;
const forbidden = () => ApiError.fromResponse({ status: 403 }, { message: "You do not teach this course", error: { code: "FORBIDDEN" } });

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  resetSubjectsFixtureStore();
  delete process.env.NEXT_PUBLIC_MAX_UPLOAD_MB;
  service.getMySubjects.mockImplementation(async (termId) => makeSubjectCardsFixture(termId));
  service.getScheme.mockImplementation(async (courseId, termId) => {
    const scheme = makeSchemeFixture(courseId, termId);
    if (!scheme) throw forbidden();
    return scheme;
  });
  service.getCourseResources.mockImplementation(async (courseId) => makeCourseResourcesFixture(courseId));
  service.saveWeek.mockImplementation(async (courseId, week, body) => saveSchemeWeekFixture(courseId, week, body)!);
  service.setTaught.mockImplementation(async (courseId, week, body) => setWeekTaughtFixture(courseId, week, body)!);
  service.createResource.mockImplementation(async (body) => createResourceFixture(body));
  service.removeResource.mockImplementation(async (id) => {
    removeResourceFixture(id);
  });
  service.getLegacyCurriculum.mockImplementation(async (id) => makeLegacyCurriculumFixture(id)!);
});

/**
 * The plan's row for a week.
 *
 * @param week - The week.
 * @returns The list item.
 */
async function weekRow(week: number): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: /Weeks of the scheme of work/ });
  return within(list).getAllByRole("listitem")[week - 1];
}

/**
 * Opens the upload sheet from the detail header.
 *
 * @returns The dialog.
 */
async function openUpload(): Promise<HTMLElement> {
  await screen.findByRole("list", { name: /Weeks of the scheme of work/ });
  fireEvent.click(screen.getByRole("button", { name: "Upload resource" }));
  const dialog = await screen.findByRole("dialog", { name: "Upload a resource" });
  await waitFor(() => expect(within(dialog).getByLabelText("Week")).toHaveValue("3"));
  return dialog;
}

/**
 * Picks a file in the upload sheet.
 *
 * @param dialog - The sheet.
 * @param file - The file.
 */
function chooseFile(dialog: HTMLElement, file: File) {
  fireEvent.change(within(dialog).getByLabelText("File to upload"), { target: { files: [file] } });
}

describe("SubjectsScreen", () => {
  it("renders the cards and the first subject's plan, with every guide target", async () => {
    const { container } = render(<SubjectsScreen />);
    expect(await screen.findByRole("heading", { level: 2, name: "Mathematics · JSS1 A" })).toBeInTheDocument();

    const cards = within(screen.getByRole("group", { name: "Your subjects" })).getAllByRole("button");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveAttribute("aria-pressed", "true");
    expect(cards[0]).toHaveTextContent("MTH111");
    expect(cards[0]).toHaveTextContent("JSS1 A · 8 lessons a week");
    expect(cards[0]).toHaveTextContent("2 of 12 weeks taught");
    expect(cards[1]).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByText("MTH111 · 12 students · 8 lessons a week · week 3 of 12 now")).toBeInTheDocument();
    const rows = within(await screen.findByRole("list", { name: /Weeks of the scheme of work/ })).getAllByRole("listitem");
    expect(rows).toHaveLength(12);
    expect(rows[0]).toHaveTextContent("Taught");
    expect(rows[0]).toHaveTextContent("1 resource shared");
    expect(rows[2]).toHaveTextContent("Fractions: types and equivalence");
    expect(rows[2]).toHaveTextContent("This week");
    expect(rows[3]).toHaveTextContent("Planned");
    expect(rows[6]).toHaveTextContent("No objectives written yet");

    for (const target of ["subjects-cards", "subjects-plan", "subjects-mark-taught", "subjects-tab-resources", "subjects-upload"]) {
      expect(container.querySelectorAll(`[data-guide="${target}"]`)).toHaveLength(1);
    }
    expect(container.querySelector('[data-guide="subjects-mark-taught"]')).toHaveTextContent("Undo");
    expect(replace).toHaveBeenCalledWith("/subjects?courseId=k1&tab=plan", { scroll: false });
  });

  it("marks a week taught, and offers the toggle only up to the current week", async () => {
    render(<SubjectsScreen />);
    const week3 = await weekRow(3);
    expect(within(await weekRow(4)).queryByRole("button", { name: /Mark taught|Undo/ })).toBeNull();
    expect(within(await weekRow(12)).queryByRole("button", { name: /Mark taught|Undo/ })).toBeNull();

    fireEvent.click(within(week3).getByRole("button", { name: "Mark taught for week 3" }));
    await waitFor(() => expect(service.setTaught).toHaveBeenCalledWith("k1", 3, { taught: true, termId: "term-1" }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Week 3 marked as taught."));
    expect(within(await weekRow(3)).getByRole("button", { name: "Undo taught for week 3" })).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("group", { name: "Your subjects" })).getAllByRole("button")[0]).toHaveTextContent("3 of 12 weeks taught"));
  });

  it("puts a week back when the taught toggle fails", async () => {
    service.setTaught.mockRejectedValueOnce(ApiError.fromResponse({ status: 409 }, { message: "Week 1 cannot be changed now" }));
    render(<SubjectsScreen />);
    fireEvent.click(within(await weekRow(1)).getByRole("button", { name: "Undo taught for week 1" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Week 1 cannot be changed now"));
    expect(within(await weekRow(1)).getByRole("button", { name: "Undo taught for week 1" })).toBeInTheDocument();
    expect(await weekRow(1)).toHaveTextContent("Taught");
  });

  it("edits a week's topic and objectives", async () => {
    render(<SubjectsScreen />);
    fireEvent.click(within(await weekRow(7)).getByRole("button", { name: "Edit week 7" }));
    const dialog = await screen.findByRole("dialog", { name: "Week 7" });
    expect(within(dialog).getByText("Mathematics · JSS1 A")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Topic")).toHaveValue("Mid-term review");
    expect(within(dialog).getByLabelText("Objectives")).toHaveAttribute("placeholder", "What students should be able to do by the end of the week");

    fireEvent.change(within(dialog).getByLabelText("Objectives"), { target: { value: "  Revise weeks 1 to 6.  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save week" }));
    await waitFor(() =>
      expect(service.saveWeek).toHaveBeenCalledWith("k1", 7, { topic: "Mid-term review", objectives: "Revise weeks 1 to 6.", termId: "term-1" }),
    );
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Week 7 saved."));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await weekRow(7)).toHaveTextContent("Revise weeks 1 to 6.");
  });

  it("lists the resources, and opening one records no view for a teacher", async () => {
    render(<SubjectsScreen />);
    const tab = await screen.findByRole("tab", { name: "Resources · 2" });
    fireEvent.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");

    const list = await screen.findByRole("list", { name: "Resources for Mathematics · JSS1 A" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("PDF");
    expect(items[0]).toHaveTextContent(/Week 1 · 420 KB · 8 Sep( 2026)? · Students and parents/);
    expect(items[0]).toHaveTextContent("11 views");
    expect(items[1]).toHaveTextContent("Slides");
    expect(screen.getByText("Students in JSS1 A see these in their portal. Parents see them if you allow it.")).toBeInTheDocument();

    const link = within(items[0]).getByRole("link", { name: /Place value worksheet/ });
    expect(link).toHaveAttribute("href", "https://res.cloudinary.com/talim-fixture/raw/upload/place-value-worksheet.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(service.recordResourceView).not.toHaveBeenCalled();
  });

  it("shows the empty state for a subject with nothing shared", async () => {
    service.getCourseResources.mockResolvedValue(makeNoResourcesFixture());
    render(<SubjectsScreen initialCourseId="k3" initialTab="resources" />);
    expect(await screen.findByText("Nothing shared for this subject yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Resources for/ })).toBeNull();
  });

  it("removes a resource after the confirmation", async () => {
    render(<SubjectsScreen initialCourseId="k1" initialTab="resources" />);
    const list = await screen.findByRole("list", { name: "Resources for Mathematics · JSS1 A" });
    fireEvent.click(within(list).getByRole("button", { name: "Remove Place value worksheet" }));

    const dialog = await screen.findByRole("dialog", { name: "Remove “Place value worksheet”?" });
    expect(within(dialog).getByText("Students will no longer see it. This cannot be undone.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(service.removeResource).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Resource removed."));
    await waitFor(() => expect(within(screen.getByRole("list", { name: /Resources for/ })).getAllByRole("listitem")).toHaveLength(1));
  });

  it("keeps Upload disabled until there is a name and a file, and shows a Cloudinary failure in the sheet", async () => {
    service.uploadFile.mockRejectedValue(Object.assign(new Error("Network error while uploading. Check your connection and try again."), { name: "UploadError", aborted: false }));
    render(<SubjectsScreen />);
    const dialog = await openUpload();
    const upload = within(dialog).getByRole("button", { name: "Upload" });

    expect(within(dialog).getByLabelText("Week")).toHaveDisplayValue("Week 3 · Fractions: types and equivalence (this week)");
    expect(within(dialog).getByLabelText("Name")).toHaveAttribute("placeholder", "e.g. Fractions: types and equivalence worksheet");
    expect(within(dialog).getByText("PDF, Word, slides, images or video up to 50 MB")).toBeInTheDocument();
    expect(within(dialog).getByText("Give it a name and choose a file to continue.")).toBeInTheDocument();
    expect(upload).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Fractions worksheet" } });
    expect(upload).toBeDisabled();
    chooseFile(dialog, new File(["x".repeat(2048)], "fractions.pdf", { type: "application/pdf" }));
    expect(within(dialog).getByText("fractions.pdf")).toBeInTheDocument();
    expect(within(dialog).getByText("Ready to upload · 2 KB")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Change" })).toBeInTheDocument();
    expect(upload).toBeEnabled();

    fireEvent.click(upload);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Network error while uploading. Check your connection and try again.");
    expect(service.createResource).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Upload" })).toBeEnabled();
  });

  it("rejects a file over the cap before uploading", async () => {
    process.env.NEXT_PUBLIC_MAX_UPLOAD_MB = "1";
    render(<SubjectsScreen />);
    const dialog = await openUpload();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Clip" } });
    const big = new File(["x"], "clip.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 2 * 1024 * 1024 });
    chooseFile(dialog, big);
    expect(within(dialog).getByText("clip.mp4 is larger than 1 MB.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("uploads with the §24 fields, and a retry after an API failure does not upload the file again", async () => {
    service.uploadFile.mockImplementation(async (_file, options) => {
      options?.onProgress?.(0.42);
      return "https://res.cloudinary.test/fractions.pdf";
    });
    service.createResource.mockRejectedValueOnce(ApiError.fromResponse({ status: 400 }, { message: "termId must be a mongo id" }));
    render(<SubjectsScreen />);
    const dialog = await openUpload();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: " Fractions worksheet " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Students and parents" }));
    chooseFile(dialog, new File(["x".repeat(100)], "fractions.pdf", { type: "application/pdf" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Upload" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("termId must be a mongo id");
    fireEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(await screen.findByRole("dialog", { name: "Uploaded" })).toBeInTheDocument();
    expect(service.uploadFile).toHaveBeenCalledTimes(1);
    expect(service.createResource).toHaveBeenCalledTimes(2);
    expect(service.createResource).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Fractions worksheet",
        courseId: "k1",
        classId: "c1",
        termId: "term-1",
        week: 3,
        visibility: "students_and_parents",
        kind: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        image: "https://res.cloudinary.test/fractions.pdf",
        files: ["https://res.cloudinary.test/fractions.pdf"],
      }),
    );
    expect(screen.getByText("“Fractions worksheet” is now available to students and parents in JSS1 A, filed under week 3.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("loads another subject's weeks when the subject changes in the upload sheet", async () => {
    render(<SubjectsScreen />);
    const dialog = await openUpload();
    fireEvent.click(within(dialog).getByRole("button", { name: "Further Mathematics · JSS2 B" }));
    await waitFor(() => expect(within(dialog).getByLabelText("Week")).toHaveDisplayValue("Week 3 · Binary operations (this week)"));
    expect(service.getScheme).toHaveBeenCalledWith("k3", undefined);
  });

  it("opens the resources tab of a deep-linked subject", async () => {
    render(<SubjectsScreen initialCourseId="k2" initialTab="resources" />);
    expect(await screen.findByRole("heading", { level: 2, name: "Mathematics · JSS2 B" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Resources/ })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("link", { name: /Directed numbers practice set/ })).toBeInTheDocument();
    const cards = within(screen.getByRole("group", { name: "Your subjects" })).getAllByRole("button");
    expect(cards[1]).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/subjects?courseId=k2&tab=resources", { scroll: false }));
  });

  it("scrolls to and highlights a deep-linked week", async () => {
    jest.useFakeTimers();
    try {
      render(<SubjectsScreen initialCourseId="k1" initialTab="plan" initialWeek={5} />);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      const row = await weekRow(5);
      await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
      expect(row).toHaveClass("ring-2");
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(row).not.toHaveClass("ring-2");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows the old curriculum under Earlier notes only when opened, sanitised", async () => {
    service.getLegacyCurriculum.mockResolvedValue({ ...makeLegacyCurriculumFixture("cur-k1")!, content: '<p>Number work first.</p><script>window.hacked = true</script><img src="x" onerror="alert(1)">' });
    const { container } = render(<SubjectsScreen />);
    const toggle = await screen.findByRole("button", { name: /Earlier notes/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(service.getLegacyCurriculum).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("Number work first.")).toBeInTheDocument();
    expect(service.getLegacyCurriculum).toHaveBeenCalledWith("cur-k1");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("onerror")).toBeNull();
  });

  it("explains an empty term", async () => {
    service.getMySubjects.mockResolvedValue(makeNoSubjectsFixture());
    render(<SubjectsScreen />);
    expect(await screen.findByRole("heading", { name: "No subjects yet" })).toBeInTheDocument();
    expect(service.getScheme).not.toHaveBeenCalled();
  });

  it("says a deep-linked course that is not one of the cards is not the teacher's, without asking for it", async () => {
    render(<SubjectsScreen initialCourseId="k9" />);
    expect(await screen.findByRole("heading", { name: "Not one of your subjects" })).toBeInTheDocument();
    expect(service.getScheme).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("group", { name: "Your subjects" })).getAllByRole("button")[0]);
    expect(await screen.findByRole("heading", { level: 2, name: "Mathematics · JSS1 A" })).toBeInTheDocument();
  });

  it("says a subject the server refuses (403) is not the teacher's", async () => {
    service.getScheme.mockRejectedValue(forbidden());
    render(<SubjectsScreen />);
    expect(await screen.findByRole("heading", { name: "Not one of your subjects" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("offers a retry when the subjects cannot be loaded", async () => {
    service.getMySubjects.mockRejectedValueOnce(ApiError.fromResponse({ status: 500 }, { message: "Server down" }));
    render(<SubjectsScreen />);
    expect(await screen.findByRole("heading", { name: "We could not load your subjects" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Mathematics · JSS1 A" })).toBeInTheDocument();
  });

  it("shows a skeleton while the subjects load", () => {
    service.getMySubjects.mockReturnValue(new Promise(() => undefined));
    render(<SubjectsScreen />);
    expect(screen.getByRole("status", { name: "Loading your subjects" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Subjects" })).toBeInTheDocument();
    expect(screen.getByLabelText("Term")).toBeInTheDocument();
  });

  it("switching the term refetches the cards and the scheme for that term", async () => {
    render(<SubjectsScreen />);
    await screen.findByRole("list", { name: /Weeks of the scheme of work/ });
    fireEvent.change(screen.getByLabelText("Term"), { target: { value: "term-0" } });
    await waitFor(() => expect(service.getMySubjects).toHaveBeenCalledWith("term-0"));
    await waitFor(() => expect(service.getScheme).toHaveBeenCalledWith("k1", "term-0"));
    await waitFor(() => expect(screen.getByText("MTH111 · 12 students · 8 lessons a week")).toBeInTheDocument());
    // Outside the term there is nothing to mark.
    expect(screen.queryByRole("button", { name: /Mark taught|Undo/ })).toBeNull();
  });

  it("fetches nothing while a temporary password must be changed", () => {
    render(<SubjectsScreen />, { user: mockTeacherMustChangePassword });
    expect(service.getMySubjects).not.toHaveBeenCalled();
  });
});
