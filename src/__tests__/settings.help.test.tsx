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

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: jest.fn() }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), patch: jest.fn() } }));
jest.mock("@/app/services/chat.service", () => ({ openOfficeRoom: jest.fn() }));
jest.mock("@/components/tour/TourProvider", () => ({ TOUR_STEPS: [], useTour: () => null }));
jest.mock("@/app/services/support/tickets.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/tickets.fixture");
  return { ticketsService: { listMine: jest.fn(async () => fixture.listMyTicketsFixture()), get: jest.fn(async (id: string) => fixture.getTicketFixture(id)) } };
});
jest.mock("@/app/services/account/account.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/settings.fixture");
  return {
    accountService: {
      getSchoolContact: jest.fn(async () => fixture.makeSchoolContactFixture()),
    },
  };
});

const service = accountService as jest.Mocked<typeof accountService>;
const openOffice = openOfficeRoom as jest.Mock;

/**
 * Renders Help and opens one of its sheets.
 *
 * @param row - The row that opens it.
 * @returns The sheet's dialog.
 */
async function openSheet(row: "Contact the school office") {
  render(<HelpPanel />);
  fireEvent.click(screen.getByRole("button", { name: row }));
  return screen.findByRole("dialog");
}

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockResolvedValue({ preferences: {} });
  window.history.replaceState(null, "", "/settings?tab=help");
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
