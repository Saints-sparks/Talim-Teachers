/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { HelpPanel } from "@/components/settings/HelpPanel";
import { accountService } from "@/app/services/account/account.service";
import { openOfficeRoom } from "@/app/services/chat.service";
import { toast } from "@/components/CustomToast";
import { api } from "@/lib/apiClient";
import { APP_VERSION } from "@/lib/appVersion";
import { ApiError } from "@/lib/apiError";
import { mockTeacher } from "@/test-utils/render";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: jest.fn() }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), patch: jest.fn() } }));
jest.mock("@/app/services/chat.service", () => ({ openOfficeRoom: jest.fn() }));
jest.mock("@/components/tour/TourProvider", () => ({ TOUR_STEPS: [], useTour: () => null }));
jest.mock("@/app/services/account/account.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/settings.fixture");
  return {
    accountService: {
      createSupportTicket: jest.fn(async (body: object) => fixture.createSupportTicketFixture(body)),
      getSchoolContact: jest.fn(async () => fixture.makeSchoolContactFixture()),
    },
  };
});

const service = accountService as jest.Mocked<typeof accountService>;
const openOffice = openOfficeRoom as jest.Mock;
const PROBLEM = "I published 1st CA for JSS2 B but students say they cannot see it.";

/**
 * Renders Help and opens one of its sheets.
 *
 * @param row - The row that opens it.
 * @returns The sheet's dialog.
 */
async function openSheet(row: "Report a problem" | "Contact the school office") {
  render(<HelpPanel />);
  fireEvent.click(screen.getByRole("button", { name: row }));
  return screen.findByRole("dialog");
}

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockResolvedValue({ preferences: {} });
  window.history.replaceState(null, "", "/settings?tab=help");
});

describe("Help → Report a problem", () => {
  it("offers the areas and a labelled description, and keeps Send off under 10 characters", async () => {
    const dialog = await openSheet("Report a problem");

    expect(within(dialog).getByRole("heading", { name: "Tell Talim what is not working" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("This goes to the Talim support team, not your school.");
    const areas = within(dialog).getByRole("group", { name: "Where did it happen?" });
    expect(within(areas).getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Grading",
      "Attendance",
      "Timetable",
      "Messages",
      "Signing in",
      "Something else",
    ]);
    expect(within(areas).getByRole("button", { name: "Grading" })).toHaveAttribute("aria-pressed", "true");
    expect(dialog).toHaveTextContent(`We reply to ${mockTeacher.email}. Student records are not shared with support unless you ask us to look at them.`);

    const send = within(dialog).getByRole("button", { name: "Send to Talim support" });
    const text = within(dialog).getByLabelText("What went wrong");
    expect(text).toHaveAttribute("placeholder", PROBLEM.replace("I published", "e.g. I published"));
    expect(send).toBeDisabled();
    fireEvent.change(text, { target: { value: "It broke" } });
    expect(send).toBeDisabled();
    expect(text).toHaveAccessibleDescription("8 / 2000 · at least 10 characters");
    fireEvent.change(text, { target: { value: PROBLEM } });
    expect(send).toBeEnabled();
    expect(service.createSupportTicket).not.toHaveBeenCalled();
  });

  it("sends the area, the description and the context, then shows the reference", async () => {
    const dialog = await openSheet("Report a problem");
    fireEvent.click(within(dialog).getByRole("button", { name: "Signing in" }));
    expect(within(dialog).getByRole("button", { name: "Signing in" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(within(dialog).getByLabelText("What went wrong"), { target: { value: `  ${PROBLEM}  ` } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send to Talim support" }));

    await waitFor(() => expect(service.createSupportTicket).toHaveBeenCalledTimes(1));
    expect(service.createSupportTicket).toHaveBeenCalledWith({
      area: "signing_in",
      description: PROBLEM,
      context: { path: "/settings?tab=help", appVersion: APP_VERSION, userAgent: window.navigator.userAgent },
    });
    expect(await within(dialog).findByText("Report sent")).toBeInTheDocument();
    expect(dialog).toHaveTextContent(`Talim support will reply to ${mockTeacher.email} within one working day.`);
    expect(within(dialog).getByText("Reference")).toBeInTheDocument();
    expect(within(dialog).getByText(/^TS-\d{5}$/)).toBeInTheDocument();
  });

  it("shows why sending failed and keeps the text", async () => {
    service.createSupportTicket.mockRejectedValueOnce(ApiError.fromResponse({ status: 503 }, { error: { code: "SERVICE_UNAVAILABLE", message: "Support is unavailable right now" } }));
    const dialog = await openSheet("Report a problem");
    fireEvent.change(within(dialog).getByLabelText("What went wrong"), { target: { value: PROBLEM } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send to Talim support" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Support is unavailable right now");
    expect(within(dialog).getByLabelText("What went wrong")).toHaveValue(PROBLEM);
    expect(within(dialog).queryByText("Report sent")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Send to Talim support" })).toBeEnabled();
  });
});

describe("Help → Contact the school office", () => {
  it("shows the school's own contact details with working links", async () => {
    const dialog = await openSheet("Contact the school office");

    expect(await within(dialog).findByRole("heading", { name: "Easy Sparks Education Center" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("The school office, Monday to Friday, 8am – 4pm.");
    expect(within(dialog).getByRole("link", { name: /Call the office/ })).toHaveAttribute("href", "tel:+2348024157730");
    expect(within(dialog).getByText("+234 802 415 7730")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Email the office/ })).toHaveAttribute("href", "mailto:office@easysparks.edu.ng");
    const map = within(dialog).getByRole("link", { name: /Google Maps/ });
    expect(map).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=14%20Oduduwa%20Crescent%2C%20GRA%20Ikeja%2C%20Lagos");
    expect(map).toHaveAttribute("target", "_blank");
    expect(map).toHaveAttribute("rel", "noopener noreferrer");
    expect(dialog).toHaveTextContent("For timetable changes or class assignments, contact the office. For a fault in the portal itself, use Report a problem.");
  });

  it("leaves out what the school has not set", async () => {
    service.getSchoolContact.mockResolvedValueOnce({ name: "Grace Academy", phone: null, email: "office@grace.test", address: null, officeHours: null });
    const dialog = await openSheet("Contact the school office");

    expect(await within(dialog).findByRole("heading", { name: "Grace Academy" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("The school office.");
    expect(within(dialog).queryByText("Call the office")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Visit")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Email the office")).toBeInTheDocument();
  });

  it("opens the office conversation in Messages", async () => {
    openOffice.mockResolvedValue("room-office-1");
    const dialog = await openSheet("Contact the school office");
    fireEvent.click(within(dialog).getByRole("button", { name: "Message the school office in the portal" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/messages?room=room-office-1"));
    expect(openOffice).toHaveBeenCalledTimes(1);
  });

  it("toasts when the office conversation can't be opened", async () => {
    openOffice.mockRejectedValue(new Error("The school office conversation could not be opened."));
    const dialog = await openSheet("Contact the school office");
    fireEvent.click(within(dialog).getByRole("button", { name: "Message the school office in the portal" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The school office conversation could not be opened."));
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a loading state while the details load", async () => {
    service.getSchoolContact.mockReturnValueOnce(new Promise(() => undefined));
    const first = await openSheet("Contact the school office");
    expect(within(first).getByRole("status", { name: "Loading the school office's details" })).toBeInTheDocument();
    // The portal conversation doesn't depend on the contact details.
    expect(within(first).getByRole("button", { name: "Message the school office in the portal" })).toBeInTheDocument();
  });

  it("shows the error with a retry", async () => {
    service.getSchoolContact.mockRejectedValueOnce(new Error("Server down"));
    const dialog = await openSheet("Contact the school office");
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("We could not load the office's contact details.");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await within(dialog).findByText("Call the office")).toBeInTheDocument();
  });
});
