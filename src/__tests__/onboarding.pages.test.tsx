/**
 * @jest-environment jsdom
 *
 * The redesigned first-run pages: confirming the profile, and the setup
 * checklist in the shape of Today's "Finish setting up" card. The steps and
 * their storage are the onboarding context's; only the pages are rendered.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProfileStep from "@/app/onboarding/page";
import SetupStep from "@/app/onboarding/setup/page";
import { fetchTeacherDetails } from "@/app/services/api.service";
import { uploadProfileAvatar } from "@/app/lib/avatarUpload";
import type { TeacherOnboardingStepId } from "@/app/context/OnboardingContext";

const push = jest.fn();
const replace = jest.fn();
const router = { push, replace };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/app/services/api.service", () => ({ fetchTeacherDetails: jest.fn() }));
jest.mock("@/app/lib/avatarUpload", () => ({ uploadProfileAvatar: jest.fn() }));
jest.mock("@/app/hooks/useAuth", () => ({ useAuth: () => ({ getAccessToken: () => "token" }) }));
const updateUser = jest.fn();
jest.mock("@/app/context/AppContext", () => ({
  useAppContext: () => ({ user: { userId: "u1", firstName: "Tolu", lastName: "Ade", email: "tolu@school.test" }, updateUser }),
}));

const syncProgress = jest.fn();
jest.mock("@/app/hooks/useOnboardingSync", () => ({ useOnboardingSync: () => ({ syncProgress }) }));

let onboarding: {
  isHydrated: boolean;
  phase1Completed: boolean;
  completed: TeacherOnboardingStepId[];
  locked: TeacherOnboardingStepId[];
};
const completePhase1 = jest.fn();
jest.mock("@/app/context/OnboardingContext", () => {
  const actual = jest.requireActual("@/app/context/OnboardingContext");
  return {
    ...actual,
    useTeacherOnboarding: () => {
      const total = actual.TEACHER_ONBOARDING_STEPS.length;
      const done = onboarding.completed.length;
      return {
        isHydrated: onboarding.isHydrated,
        phase1Completed: onboarding.phase1Completed,
        completePhase1,
        isStepComplete: (id: TeacherOnboardingStepId) => onboarding.completed.includes(id),
        isStepLocked: (id: TeacherOnboardingStepId) => onboarding.locked.includes(id),
        completedCount: done,
        totalCount: total,
        progressPercent: Math.round((done / total) * 100),
        isFullyComplete: done === total,
      };
    },
  };
});

const details = fetchTeacherDetails as jest.Mock;
const upload = uploadProfileAvatar as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  onboarding = { isHydrated: true, phase1Completed: false, completed: [], locked: [] };
  syncProgress.mockResolvedValue(undefined);
  details.mockResolvedValue({
    userId: { firstName: "Tolu", lastName: "Ade", email: "tolu@school.test", phoneNumber: "0803 000 0000" },
    employmentRole: "Teacher",
    employmentType: "Full time",
    yearsOfExperience: 1,
    availabilityDays: ["Monday", "Tuesday"],
    classTeacherClasses: [{ _id: "c1", name: "JSS1 A" }],
    assignedCourses: [{ _id: "k1", title: "Mathematics" }],
  });
});

describe("Confirm your profile", () => {
  it("shows what the office holds, with Not set for gaps, and confirming opens the checklist", async () => {
    render(<ProfileStep />);
    expect(await screen.findByRole("heading", { level: 1, name: "Confirm your profile" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    const employment = screen.getByRole("region", { name: "Employment" });
    expect(within(employment).getByText("Full time")).toBeInTheDocument();
    expect(within(employment).getByText("Not set")).toBeInTheDocument(); // no specialisation on record
    expect(within(screen.getByRole("region", { name: "Qualifications" })).getByText("1 year")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Assigned classes and subjects" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "JSS1 A",
      "Mathematics",
    ]);
    // Before the profile is confirmed there is no way round it.
    expect(screen.queryByRole("link", { name: "Go to Today" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    expect(completePhase1).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/onboarding/setup");
  });

  it("adds a photo, and says so when it cannot be saved", async () => {
    upload.mockRejectedValueOnce(new Error("The photo is larger than 5 MB."));
    render(<ProfileStep />);
    const input = await screen.findByLabelText("Add a photo");
    fireEvent.change(input, { target: { files: [new File(["x"], "me.png", { type: "image/png" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("The photo is larger than 5 MB.");

    upload.mockResolvedValueOnce("https://cdn.test/me.png");
    fireEvent.change(input, { target: { files: [new File(["x"], "me.png", { type: "image/png" })] } });
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ userAvatar: "https://cdn.test/me.png" }));
    expect(await screen.findByLabelText("Change photo")).toBeInTheDocument();
  });

  it("goes straight to the checklist once the profile has been confirmed", async () => {
    onboarding.phase1Completed = true;
    render(<ProfileStep />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/setup"));
  });
});

describe("Finish setting up", () => {
  it("counts the steps like Today's card, and each open step starts where it is done", async () => {
    onboarding = { isHydrated: true, phase1Completed: true, completed: ["teacher-profile", "mark-attendance", "view-notifications"], locked: ["create-group-chat"] };
    render(<SetupStep />);
    expect(screen.getByRole("heading", { level: 1, name: "Finish setting up" })).toBeInTheDocument();
    expect(screen.getByText("3 of 6 done. Each step takes a minute or two, and each one opens where you do it.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Setup progress" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();

    const steps = screen.getByRole("list", { name: "Setup steps" });
    const row = (name: string) => within(steps).getByRole("heading", { name: new RegExp(name) }).closest("li")!;
    expect(within(row("Confirm your profile")).getByText("Done")).toBeInTheDocument();
    expect(within(row("Upload a resource")).getByRole("link", { name: "Start: Upload a resource" })).toHaveAttribute("href", "/subjects?tab=resources&upload=1");
    expect(within(row("Write a curriculum")).getByRole("link", { name: /Start/ })).toHaveAttribute("href", "/curriculum");
    expect(within(row("Start a group chat")).getByText("Locked")).toBeInTheDocument();
    expect(within(row("Start a group chat")).queryByRole("link")).not.toBeInTheDocument();

    // It checks with the server what has been done already, and says so while it does.
    expect(syncProgress).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Checking what you have already done…")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Go to Today" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("heading", { name: "You're all set" })).not.toBeInTheDocument();
  });

  it("says so when everything is done", () => {
    onboarding = {
      isHydrated: true,
      phase1Completed: true,
      completed: ["teacher-profile", "upload-resource", "mark-attendance", "view-notifications", "create-curriculum", "create-group-chat"],
      locked: [],
    };
    render(<SetupStep />);
    expect(screen.getByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Go to Today" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /^Start/ })).not.toBeInTheDocument();
  });

  it("sends a teacher who has not confirmed the profile back to it", async () => {
    render(<SetupStep />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    expect(syncProgress).not.toHaveBeenCalled();
  });
});
