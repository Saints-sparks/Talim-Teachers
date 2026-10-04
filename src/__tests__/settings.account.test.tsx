/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, within } from "@/test-utils/render";
import { AccountPanel } from "@/components/settings/AccountPanel";
import ProfileRedirect from "@/app/profile/page";
import { accountService } from "@/app/services/account/account.service";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { useAppContext } from "@/app/context/AppContext";
import type { TeacherSettings } from "@/hooks/settings/useTeacherSettings";

const redirect = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  redirect: (to: string) => redirect(to),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock("@/app/services/account/account.service", () => ({ accountService: { updateProfile: jest.fn() } }));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: jest.fn() }));

const get = api.get as jest.Mock;
const updateProfile = accountService.updateProfile as jest.Mock;
const appContext = useAppContext as jest.Mock;

const SETTINGS: TeacherSettings = {
  profile: {
    firstName: "Tolu",
    lastName: "Adeyemi",
    email: "tolu@easysparks.edu.ng",
    phoneNumber: "+234 803 000 1111",
    schoolName: "Easy Sparks Education Center",
    joinedAt: "2026-05-12T12:00:00.000Z",
  },
  employment: { employeeId: "260200001", isFormTeacher: true, employmentType: "full_time" },
  preferences: {},
};

const RECORD = {
  classTeacherClasses: [{ _id: "c1", name: "Grade 5A" }],
  assignedCourses: [{ _id: "k1", title: "Mathematics", courseCode: "MTH-5A" }],
  highestAcademicQualification: "B.Ed Mathematics",
  yearsOfExperience: 6,
  availabilityDays: ["monday", "tuesday"],
  availableTime: "8am – 2pm",
};

/**
 * The input labelled `label`.
 *
 * @param label - The visible label.
 * @returns The input.
 */
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

beforeEach(() => {
  jest.clearAllMocks();
  get.mockImplementation(async (url: string) => {
    if (url === "/teacher/settings") return SETTINGS;
    throw new Error(`unexpected GET ${url}`);
  });
  updateProfile.mockResolvedValue({ profile: {} });
  appContext.mockReturnValue({ teacherData: RECORD });
});

describe("Settings → Account", () => {
  it("prefills the name and phone and shows the read-only details the design lists", async () => {
    render(<AccountPanel />);

    expect(await screen.findByLabelText("First name")).toHaveValue("Tolu");
    expect(field("Last name")).toHaveValue("Adeyemi");
    expect(field("Phone")).toHaveValue("+234 803 000 1111");
    expect(field("Phone")).toHaveAttribute("type", "tel");
    expect(screen.getByText("tolu@easysparks.edu.ng")).toBeInTheDocument();
    expect(screen.getByText("The school office changes your email.")).toBeInTheDocument();
    expect(screen.getByText("Teacher · class teacher")).toBeInTheDocument();
    expect(screen.getByText("260200001")).toBeInTheDocument();
    expect(screen.getByText("Easy Sparks Education Center")).toBeInTheDocument();
    expect(screen.getByText("12 May 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change photo" })).toBeInTheDocument();
    expect(screen.getByText(/Changes save when you leave a field and appear across the portal/)).toBeInTheDocument();
    // Nothing in Settings links to the old profile page any more.
    expect(document.querySelector('a[href="/profile"]')).toBeNull();
  });

  it("shows what the old Profile page had: classes and subjects, qualifications, employment and availability", async () => {
    render(<AccountPanel />);
    await screen.findByLabelText("First name");

    expect(screen.getByText("Grade 5A")).toBeInTheDocument();
    expect(screen.getByText("Mathematics (MTH-5A)")).toBeInTheDocument();
    expect(screen.getByText("B.Ed Mathematics")).toBeInTheDocument();
    expect(screen.getByText("6 years")).toBeInTheDocument();
    expect(screen.getByText("Full time")).toBeInTheDocument();
    expect(screen.getByText("Monday, Tuesday")).toBeInTheDocument();
    expect(screen.getByText("8am – 2pm")).toBeInTheDocument();
    // An empty field (subject expertise) is left out rather than shown blank.
    expect(screen.queryByText("Subject expertise")).not.toBeInTheDocument();
  });

  it("says class teacher from the classes the teacher leads, whatever the stale profile flag says (A6)", async () => {
    get.mockImplementation(async (url: string) => {
      if (url === "/teacher/settings") return { ...SETTINGS, employment: { ...SETTINGS.employment, isFormTeacher: false } };
      throw new Error(`unexpected GET ${url}`);
    });
    appContext.mockReturnValue({ teacherData: { ...RECORD, classTeacherOf: [{ id: "c1", name: "Grade 5A" }] } });
    const { unmount } = render(<AccountPanel />);
    expect(await screen.findByText("Teacher · class teacher")).toBeInTheDocument();
    unmount();

    get.mockImplementation(async (url: string) => {
      if (url === "/teacher/settings") return SETTINGS;
      throw new Error(`unexpected GET ${url}`);
    });
    appContext.mockReturnValue({ teacherData: { ...RECORD, classTeacherOf: [] } });
    render(<AccountPanel />);
    expect(await screen.findByText("Teacher")).toBeInTheDocument();
    expect(screen.queryByText("Teacher · class teacher")).not.toBeInTheDocument();
  });

  it("shows no record sections when the teacher record is empty, and dashes for missing details", async () => {
    appContext.mockReturnValue({ teacherData: null });
    get.mockResolvedValue({ profile: { firstName: "Tolu" } });
    render(<AccountPanel />);
    await screen.findByLabelText("First name");

    expect(screen.queryByText("Classes and subjects")).not.toBeInTheDocument();
    expect(screen.queryByText("Qualifications and experience")).not.toBeInTheDocument();
    expect(screen.getByText("Teacher")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    // Missing fields fall back to the signed-in user.
    expect(field("Last name")).toHaveValue("Bello");
  });

  it("saves only the changed field on blur, says Saving… then Saved, and updates the signed-in user", async () => {
    let finish: (value: unknown) => void = () => undefined;
    updateProfile.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const updateUser = jest.fn();
    render(<AccountPanel />, { auth: { updateUser } });

    const first = await screen.findByLabelText("First name");
    fireEvent.focus(first);
    fireEvent.change(first, { target: { value: "  Tolulope " } });
    fireEvent.blur(first);

    expect(await screen.findByText("Saving…")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({ firstName: "Tolulope" });

    await act(async () => finish({ profile: {} }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(first).toHaveValue("Tolulope");
    expect(updateUser).toHaveBeenCalledWith({ firstName: "Tolulope" });
  });

  it("does not save when the value did not change (spaces aside)", async () => {
    render(<AccountPanel />);
    const phone = await screen.findByLabelText("Phone");
    fireEvent.change(phone, { target: { value: " +234 803 000 1111  " } });
    fireEvent.blur(phone);
    fireEvent.blur(field("First name"));

    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });

  it("refuses an empty name or a bad phone without saving", async () => {
    render(<AccountPanel />);
    const last = await screen.findByLabelText("Last name");

    fireEvent.change(last, { target: { value: "   " } });
    fireEvent.blur(last);
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your last name");
    expect(last).toHaveAttribute("aria-invalid", "true");

    const phone = field("Phone");
    fireEvent.change(phone, { target: { value: "call me" } });
    fireEvent.blur(phone);
    expect(await screen.findByText("Use 7 to 20 digits, spaces or dashes, with an optional +")).toBeInTheDocument();

    const first = field("First name");
    fireEvent.change(first, { target: { value: "x".repeat(61) } });
    fireEvent.blur(first);
    expect(await screen.findByText("Use 60 characters or fewer")).toBeInTheDocument();

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("shows the server's own reason for a field it refuses", async () => {
    updateProfile.mockRejectedValue(
      ApiError.fromResponse(
        { status: 400 },
        { error: { code: "VALIDATION_FAILED", message: "Some fields need attention.", details: [{ field: "phoneNumber", reason: "That number is already in use" }] } },
      ),
    );
    render(<AccountPanel />);
    const phone = await screen.findByLabelText("Phone");
    fireEvent.change(phone, { target: { value: "0803 000 2222" } });
    fireEvent.blur(phone);

    expect(await screen.findByRole("alert")).toHaveTextContent("That number is already in use");
    expect(updateProfile).toHaveBeenCalledWith({ phoneNumber: "0803 000 2222" });
    // The text stays so it can be corrected.
    expect(phone).toHaveValue("0803 000 2222");
  });

  it("shows a skeleton while loading", () => {
    get.mockReturnValue(new Promise(() => undefined));
    render(<AccountPanel />);
    expect(screen.getByRole("status", { name: "Loading your account" })).toBeInTheDocument();
  });

  it("shows the error with a retry", async () => {
    get.mockRejectedValueOnce(new Error("The server is down"));
    render(<AccountPanel />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load your account.");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("First name")).toHaveValue("Tolu");
  });
});

describe("/profile", () => {
  it("forwards to Settings → Account", () => {
    ProfileRedirect();
    expect(redirect).toHaveBeenCalledWith("/settings?tab=account");
  });

  it("leaves no link to /profile in the source", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
        } else if (/\.tsx?$/.test(entry.name) && /["'`]\/profile["'`?]/.test(fs.readFileSync(full, "utf8"))) {
          offenders.push(path.relative(process.cwd(), full));
        }
      }
    };
    walk(path.join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});
