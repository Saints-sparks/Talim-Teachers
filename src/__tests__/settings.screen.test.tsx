/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { ThemeProvider } from "@/providers/theme-provider";
import { toast } from "@/components/CustomToast";
import { api } from "@/lib/apiClient";
import { APP_VERSION } from "@/lib/appVersion";
import { landingCacheKey } from "@/app/lib/landing";
import { mockTeacher } from "@/test-utils/render";
import { resetSettingsFixtureStore } from "@/lib/fixtures/settings.fixture";
import { gettingStartedDescription, type SettingsTabId } from "@/hooks/settings/settings.logic";
import { TOUR_STEPS } from "@/components/tour/TourProvider";

const replace = jest.fn();
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: () => ({ teacherData: null }) }));
jest.mock("@/app/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    isSupported: true,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));
const openTour = jest.fn();
jest.mock("@/components/tour/TourProvider", () => ({
  TOUR_STEPS: jest.requireActual("@/components/tour/TourProvider").TOUR_STEPS,
  useTour: () => ({ openTour }),
}));
jest.mock("@/app/services/account/account.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/settings.fixture");
  return {
    accountService: {
      updateProfile: jest.fn(async (body: object) => ({ profile: body })),
      listSessions: jest.fn(async () => fixture.listSessionsFixture()),
      revokeSession: jest.fn(async (id: string) => fixture.revokeSessionFixture(id)),
      revokeOtherSessions: jest.fn(async () => fixture.revokeOtherSessionsFixture()),
      getPasswordPolicy: jest.fn(async () => fixture.makePasswordPolicyFixture()),
      createSupportTicket: jest.fn(async (body: object) => fixture.createSupportTicketFixture(body)),
      getSchoolContact: jest.fn(async () => fixture.makeSchoolContactFixture()),
    },
  };
});

const get = api.get as jest.Mock;
const patch = api.patch as jest.Mock;

const SETTINGS = {
  profile: { firstName: "Tolu", lastName: "Adeyemi", email: "tolu@easysparks.edu.ng", schoolName: "Easy Sparks Education Center" },
  employment: { employeeId: "260200001" },
  preferences: {
    messages: { showOnlineStatus: true, readReceipts: false, soundEnabled: true },
    teaching: { landingPage: "timetable", gradingView: "class", timetableDisplay: "today", attendanceMode: "mark", resourceDisplay: "grid" },
    guides: { showAppTips: true },
    theme: "system",
  },
};

const ALERTS = {
  announcementsEnabled: true,
  attendanceEnabled: false,
  resultsEnabled: true,
  resourcesEnabled: true,
  messagesEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: "19:00",
  quietHoursEnd: "06:30",
  gradingEnabled: true,
  registerReminderEnabled: false,
};

/** What the fake server holds; saved preferences are merged in, as the API would. */
let stored: typeof SETTINGS = JSON.parse(JSON.stringify(SETTINGS)) as typeof SETTINGS;

/**
 * Answers the settings and alert-preference reads.
 *
 * @param overrides - Per-URL replacements (a function to throw or hang).
 */
function serve(overrides: Record<string, () => Promise<unknown>> = {}) {
  get.mockImplementation((url: string) => {
    if (overrides[url]) return overrides[url]();
    if (url === "/teacher/settings") return Promise.resolve(stored);
    if (url === "/notifications/preferences") return Promise.resolve(ALERTS);
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

/**
 * Renders Settings on one tab.
 *
 * @param tab - The tab to open.
 * @returns The render result.
 */
const renderTab = (tab: SettingsTabId) => render(<SettingsScreen initialTab={tab} />);

/**
 * The switch named `name`.
 *
 * @param name - Its label.
 * @returns The switch.
 */
const switchNamed = (name: string) => screen.getByRole("switch", { name });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  resetSettingsFixtureStore();
  stored = JSON.parse(JSON.stringify(SETTINGS)) as typeof SETTINGS;
  serve();
  patch.mockImplementation(async (url: string, body: Record<string, unknown>) => {
    if (url === "/teacher/settings/preferences") stored = { ...stored, preferences: { ...stored.preferences, ...body } as typeof SETTINGS.preferences };
    return body;
  });
  window.history.replaceState(null, "", "/settings");
});

describe("Settings screen", () => {
  it("has the heading, a labelled rail of eight tabs and the guide targets", async () => {
    renderTab("account");

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Your account, alerts and workspace defaults.")).toBeInTheDocument();
    const rail = screen.getByRole("navigation", { name: "Settings sections" });
    expect(rail).toHaveAttribute("data-guide", "settings-tabs");
    const tabs = within(rail).getAllByRole("button");
    expect(tabs).toHaveLength(8);
    for (const id of ["account", "notifications", "messages", "teaching", "appearance", "security", "help", "about"]) {
      expect(rail.querySelector(`[data-guide="settings-tab-${id}"]`)).not.toBeNull();
    }
    const account = within(rail).getByRole("button", { name: "Account" });
    expect(account).toHaveAttribute("aria-current", "page");
    expect(account).toHaveAccessibleDescription("Profile and contact details");
    expect(within(rail).getByRole("button", { name: "Teaching preferences" })).toHaveAccessibleDescription("Workspace defaults");
    expect(screen.getByRole("heading", { level: 2, name: "Account" })).toBeInTheDocument();
    expect(screen.getByText("How colleagues, students and parents see you.")).toBeInTheDocument();
    await screen.findByLabelText("First name");
  });

  it("switches tabs and records the tab in the URL without scrolling", async () => {
    renderTab("account");
    const rail = screen.getByRole("navigation", { name: "Settings sections" });

    fireEvent.click(within(rail).getByRole("button", { name: "Security" }));

    expect(replace).toHaveBeenCalledWith("/settings?tab=security", { scroll: false });
    expect(within(rail).getByRole("button", { name: "Security" })).toHaveAttribute("aria-current", "page");
    expect(within(rail).getByRole("button", { name: "Account" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { level: 2, name: "Security" })).toBeInTheDocument();
    await screen.findByText("Chrome 129 on Windows 11");
  });

  it("follows a new ?tab= (back and forward)", async () => {
    const { rerender } = renderTab("account");
    rerender(<SettingsScreen initialTab="about" />);
    expect(screen.getByRole("heading", { level: 2, name: "About" })).toBeInTheDocument();
  });
});

describe("Notifications tab", () => {
  it("shows every category and delivery switch with the stored values", async () => {
    renderTab("notifications");

    expect(await screen.findByRole("switch", { name: "School announcements" })).toHaveAttribute("aria-checked", "true");
    expect(switchNamed("Attendance")).toHaveAttribute("aria-checked", "false");
    expect(switchNamed("Register reminders")).toHaveAttribute("aria-checked", "false");
    expect(switchNamed("Register reminders")).toHaveAccessibleDescription("A nudge 30 minutes before registers close if one is still open");
    // Missing from the server's answer: the default (on).
    expect(switchNamed("Resource activity")).toHaveAttribute("aria-checked", "true");
    expect(switchNamed("Grading deadlines")).toHaveAccessibleDescription("Seven days and one day before an assessment closes");
    expect(switchNamed("Messages")).toHaveAccessibleDescription("New messages from parents, colleagues and groups, by push and email");
    expect(switchNamed("Mobile push")).toHaveAccessibleDescription("On the Talim app");
    expect(switchNamed("Browser notifications")).toBeInTheDocument();
    expect(switchNamed("Email")).toHaveAccessibleDescription(`To ${mockTeacher.email}`);
    expect(switchNamed("Quiet hours")).toHaveAccessibleDescription("Hold non-urgent alerts between 7pm and 6:30am");
    expect(screen.getByLabelText("Start")).toHaveValue("19:00");
    expect(screen.getByLabelText("End")).toHaveValue("06:30");
    expect(screen.getByRole("heading", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivery" })).toBeInTheDocument();
  });

  it("saves one field per switch, and disables that switch while it saves", async () => {
    let finish: (value: unknown) => void = () => undefined;
    patch.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderTab("notifications");

    fireEvent.click(await screen.findByRole("switch", { name: "Register reminders" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/notifications/preferences", { registerReminderEnabled: true }));
    expect(patch).toHaveBeenCalledTimes(1);
    expect(switchNamed("Register reminders")).toHaveAttribute("aria-checked", "true");
    expect(switchNamed("Register reminders")).toBeDisabled();
    expect(switchNamed("Grading deadlines")).toBeEnabled();
    await act(async () => finish({}));
  });

  it("saves a quiet-hours time when the teacher leaves the field", async () => {
    renderTab("notifications");
    const start = await screen.findByLabelText("Start");
    fireEvent.change(start, { target: { value: "20:00" } });
    expect(patch).not.toHaveBeenCalled();
    fireEvent.blur(start);
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/notifications/preferences", { quietHoursStart: "20:00" }));
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it("hides the times while quiet hours are off", async () => {
    serve({ "/notifications/preferences": async () => ({ ...ALERTS, quietHoursEnabled: false }) });
    renderTab("notifications");
    await screen.findByRole("switch", { name: "Quiet hours" });
    expect(screen.queryByLabelText("Start")).not.toBeInTheDocument();
  });

  it("shows loading and error states", async () => {
    serve({ "/notifications/preferences": () => new Promise(() => undefined) });
    const { unmount } = renderTab("notifications");
    expect(screen.getByRole("status", { name: "Loading your notification settings" })).toBeInTheDocument();
    unmount();

    serve({ "/notifications/preferences": () => Promise.reject(new Error("Server down")) });
    renderTab("notifications");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your notification settings.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("Messages tab", () => {
  it("shows the three switches and the office hours", async () => {
    renderTab("messages");

    expect(await screen.findByRole("switch", { name: "Show online status" })).toHaveAttribute("aria-checked", "true");
    expect(switchNamed("Read receipts")).toHaveAttribute("aria-checked", "false");
    expect(switchNamed("Sound for new messages")).toHaveAttribute("aria-checked", "true");
    expect(switchNamed("Sound for new messages")).toHaveAccessibleDescription("Plays while the portal is open");
    expect(await screen.findByText("8:00am – 4:00pm")).toBeInTheDocument();
    expect(screen.getByText("Parents are told you reply during school hours")).toBeInTheDocument();
  });

  it("sends exactly { showOnlineStatus, readReceipts, soundEnabled }", async () => {
    renderTab("messages");
    fireEvent.click(await screen.findByRole("switch", { name: "Read receipts" }));

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith("/teacher/settings/preferences", {
      messages: { showOnlineStatus: true, readReceipts: true, soundEnabled: true },
    });
  });

  it("says when the school has not set office hours", async () => {
    const { accountService } = jest.requireMock("@/app/services/account/account.service");
    accountService.getSchoolContact.mockResolvedValueOnce({ name: "Easy Sparks", phone: null, email: null, address: null, officeHours: null });
    renderTab("messages");
    expect(await screen.findByText("Not set by your school")).toBeInTheDocument();
  });

  it("shows loading and error states", async () => {
    serve({ "/teacher/settings": () => new Promise(() => undefined) });
    const { unmount } = renderTab("messages");
    expect(screen.getByRole("status", { name: "Loading your message settings" })).toBeInTheDocument();
    unmount();

    serve({ "/teacher/settings": () => Promise.reject(new Error("Server down")) });
    renderTab("messages");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your message settings.");
  });
});

describe("Teaching preferences tab", () => {
  it("shows the three defaults as labelled selects", async () => {
    renderTab("teaching");

    const landing = await screen.findByRole("combobox", { name: "First screen after sign-in" });
    expect(landing).toHaveValue("timetable");
    expect(landing).toHaveAccessibleDescription("Where the portal opens");
    expect(within(landing).getAllByRole("option").map((option) => option.textContent)).toEqual(["Today", "Timetable", "Attendance", "Messages"]);
    expect(screen.getByRole("combobox", { name: "Grading opens on" })).toHaveValue("class");
    expect(screen.getByRole("combobox", { name: "Timetable view" })).toHaveValue("today");
  });

  it("saves the landing page and caches it on this device", async () => {
    renderTab("teaching");
    fireEvent.change(await screen.findByRole("combobox", { name: "First screen after sign-in" }), { target: { value: "attendance" } });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toEqual({
      teaching: { landingPage: "attendance", gradingView: "class", timetableDisplay: "today", attendanceMode: "mark", resourceDisplay: "grid" },
    });
    await waitFor(() => expect(localStorage.getItem(landingCacheKey(mockTeacher.userId))).toBe("attendance"));
  });

  it("toasts a failed save", async () => {
    patch.mockRejectedValue(new Error("Could not save"));
    renderTab("teaching");
    fireEvent.change(await screen.findByRole("combobox", { name: "Timetable view" }), { target: { value: "week" } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not save"));
  });

  it("shows loading and error states", async () => {
    serve({ "/teacher/settings": () => new Promise(() => undefined) });
    const { unmount } = renderTab("teaching");
    expect(screen.getByRole("status", { name: "Loading your teaching preferences" })).toBeInTheDocument();
    unmount();

    serve({ "/teacher/settings": () => Promise.reject(new Error("Server down")) });
    renderTab("teaching");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your teaching preferences.");
  });
});

describe("Appearance tab", () => {
  it("offers Light, Dark and System, System by default, and applies and saves a choice", async () => {
    render(
      <ThemeProvider>
        <SettingsScreen initialTab="appearance" />
      </ThemeProvider>,
    );

    const group = await screen.findByRole("radiogroup", { name: "Theme" });
    const options = within(group).getAllByRole("radio");
    expect(options.map((option) => option.textContent)).toEqual(["LightAlways use light mode", "DarkAlways use dark mode", "SystemFollow device setting"]);
    expect(within(group).getByRole("radio", { name: /System/ })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(within(group).getByRole("radio", { name: /Dark/ }));

    expect(within(group).getByRole("radio", { name: /Dark/ })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Dark theme selected.");
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/teacher/settings/preferences", { theme: "dark" }));

    fireEvent.keyDown(within(group).getByRole("radio", { name: /Dark/ }), { key: "ArrowRight" });
    expect(within(group).getByRole("radio", { name: /System/ })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("Help tab", () => {
  it("lists the tour, the page guides switch, the office and the problem report", async () => {
    renderTab("help");

    const tour = screen.getByRole("button", { name: "Getting started" });
    expect(tour).toHaveAccessibleDescription(gettingStartedDescription(TOUR_STEPS.length));
    expect(tour).toHaveAccessibleDescription(/^An? \w+ step walk through the teacher portal$/);
    fireEvent.click(tour);
    expect(openTour).toHaveBeenCalledTimes(1);
    const guides = await screen.findByRole("switch", { name: "Show page guides" });
    expect(guides).toHaveAttribute("aria-checked", "true");
    expect(guides).toHaveAccessibleDescription("A short guide on each page the first time you open it");
    expect(screen.getByRole("button", { name: "Contact the school office" })).toHaveAccessibleDescription("Call, email or visit");
    expect(screen.getByRole("button", { name: "Report a problem" })).toHaveAccessibleDescription("Goes straight to the Talim support team");

    fireEvent.click(guides);
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/teacher/settings/preferences", { guides: { showAppTips: false } }));
  });
});

describe("About tab", () => {
  it("shows the app, the version, the school and the legal links", async () => {
    renderTab("about");

    expect(screen.getByText("Talim Teachers")).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
    expect(await screen.findByText("Easy Sparks Education Center")).toBeInTheDocument();
    const privacy = screen.getByRole("link", { name: "Privacy Policy (opens in a new tab)" });
    expect(privacy).toHaveAccessibleDescription("How staff and student data is handled");
    expect(privacy).toHaveAttribute("href", "https://mytalim.com/privacy");
    expect(privacy).toHaveAttribute("target", "_blank");
    expect(privacy).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: /Terms of Service/ })).toHaveAttribute("href", "https://mytalim.com/terms");
  });
});
