/**
 * @jest-environment jsdom
 *
 * Settings → Help → My tickets (v1.5 tickets) against the ticket fixtures:
 * the list, the thread, a new ticket (the teacher's desk rule and the
 * checks), a reply, reopen inside and outside the 7-day window (409), close,
 * and the `?ticket=` deep link.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { HelpPanel } from "@/components/settings/HelpPanel";
import { ticketsService } from "@/app/services/support/tickets.service";
import { ApiError } from "@/lib/apiError";
import { resetTicketsFixture } from "@/lib/fixtures/tickets.fixture";

const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(async () => ({})), patch: jest.fn() } }));
jest.mock("@/app/services/chat.service", () => ({ openOfficeRoom: jest.fn(), uploadChatAttachment: jest.fn() }));
jest.mock("@/components/tour/TourProvider", () => ({ TOUR_STEPS: [], useTour: () => null }));
jest.mock("@/app/services/account/account.service", () => ({ accountService: { getSchoolContact: jest.fn(async () => ({ name: "School" })) } }));
jest.mock("@/app/services/support/tickets.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/tickets.fixture");
  return {
    ticketsService: {
      listMine: jest.fn(async (query: object) => fixture.listMyTicketsFixture(query)),
      get: jest.fn(async (id: string) => fixture.getTicketFixture(id)),
      create: jest.fn(async (payload: object) => fixture.createTicketFixture(payload)),
      reply: jest.fn(async (id: string, payload: object) => fixture.replyTicketFixture(id, payload)),
      reopen: jest.fn(async (id: string) => fixture.reopenTicketFixture(id)),
      close: jest.fn(async (id: string) => fixture.closeTicketFixture(id)),
      uploadAttachment: jest.fn(async (file: File) => ({ url: `https://files.test/${file.name}`, type: "file", name: file.name, mimeType: file.type, size: file.size })),
    },
  };
});

const service = ticketsService as jest.Mocked<typeof ticketsService>;

/**
 * The list of the user's tickets, once loaded.
 *
 * @returns The list element.
 */
async function ticketList() {
  return screen.findByRole("list", { name: "My tickets" });
}

/**
 * Opens a ticket's thread from the list.
 *
 * @param subject - The ticket's subject.
 * @returns The thread's dialog.
 */
async function openThread(subject: RegExp) {
  const list = await ticketList();
  fireEvent.click(within(list).getByRole("button", { name: subject }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("list", { name: "Messages" });
  return dialog;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetTicketsFixture();
  window.history.replaceState(null, "", "/settings?tab=help");
  // Like the real router, a replace changes the address bar.
  replace.mockImplementation((url: string) => window.history.replaceState(null, "", url));
});

describe("My tickets list", () => {
  it("lists the tickets with status chips, the unread dot and last activity, in one call", async () => {
    render(<HelpPanel />);
    const list = await ticketList();
    const rows = within(list).getAllByRole("button");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("New reply.");
    expect(rows[0]).toHaveTextContent("Students can't see 1st CA for JSS2 B");
    expect(rows[0]).toHaveTextContent("TS-7KQ2M · Talim support · Updated 2 hours ago");
    expect(rows[0]).toHaveTextContent("Open");
    expect(rows[1]).toHaveTextContent("Waiting on you");
    expect(rows[1]).not.toHaveTextContent("New reply.");
    expect(rows[2]).toHaveTextContent("Resolved");
    expect(service.listMine).toHaveBeenCalledTimes(1);
    expect(service.listMine).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(service.get).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Report a problem" })).not.toBeInTheDocument();
  });

  it("shows an empty state, and an error with a retry", async () => {
    service.listMine.mockResolvedValueOnce({ data: [], meta: { total: 0, page: 1, lastPage: 1, limit: 20 } });
    const { unmount } = render(<HelpPanel />);
    expect(await screen.findByText(/No tickets yet/)).toBeInTheDocument();
    unmount();

    service.listMine.mockRejectedValueOnce(new Error("Server down"));
    render(<HelpPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your tickets.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await ticketList()).toBeInTheDocument();
  });
});

describe("Ticket thread", () => {
  it("shows the messages oldest first with authors and files, and records the ticket in the URL", async () => {
    render(<HelpPanel />);
    const dialog = await openThread(/Students can't see/);
    expect(replace).toHaveBeenCalledWith("/settings?tab=help&ticket=tk-open", { scroll: false });
    expect(within(dialog).getByRole("heading", { name: "Students can't see 1st CA for JSS2 B" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("TS-7KQ2M");
    expect(dialog).toHaveTextContent("Talim support · Grading");
    const messages = within(within(dialog).getByRole("list", { name: "Messages" })).getAllByRole("listitem", { name: "" });
    expect(messages[0]).toHaveTextContent("You");
    expect(messages[0]).toHaveTextContent("I published 1st CA for JSS2 B");
    expect(within(messages[0]).getByRole("link", { name: /grading\.png/ })).toHaveAttribute("href", "https://res.cloudinary.com/talim/image/upload/grading.png");
    expect(within(dialog).getByText("Tolu from Talim")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Talim support").length).toBeGreaterThan(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/settings?tab=help", { scroll: false }));
  });

  it("opens the thread from the ?ticket= deep link", async () => {
    render(<HelpPanel ticketId="tk-waiting" />);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("heading", { name: "Signed out on my tablet every morning" })).toBeInTheDocument();
    expect(service.get).toHaveBeenCalledWith("tk-waiting");
    expect(within(dialog).getByText("Waiting on you")).toBeInTheDocument();
  });

  it("sends a reply, then shows it in the thread", async () => {
    render(<HelpPanel ticketId="tk-waiting" />);
    const dialog = await screen.findByRole("dialog");
    const box = await within(dialog).findByLabelText("Your reply");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send reply" }));
    expect(box).toHaveAccessibleDescription(/Write a message/);
    expect(service.reply).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: "  It's Chrome on a Samsung tablet.  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send reply" }));
    await waitFor(() => expect(service.reply).toHaveBeenCalledWith("tk-waiting", { body: "It's Chrome on a Samsung tablet." }));
    expect(await within(dialog).findByText("It's Chrome on a Samsung tablet.")).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText("Your reply")).toHaveValue(""));
  });

  it("explains a 409 on a reply, keeps the draft and reloads the ticket", async () => {
    service.reply.mockRejectedValueOnce(ApiError.fromResponse({ status: 409 }, { error: { code: "CONFLICT", message: "This ticket was closed by support." } }));
    render(<HelpPanel ticketId="tk-open" />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(await within(dialog).findByLabelText("Your reply"), { target: { value: "Any news?" } });
    const loads = service.get.mock.calls.length;
    fireEvent.click(within(dialog).getByRole("button", { name: "Send reply" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("This ticket was closed by support.");
    expect(within(dialog).getByLabelText("Your reply")).toHaveValue("Any news?");
    await waitFor(() => expect(service.get.mock.calls.length).toBeGreaterThan(loads));
  });

  it("reopens a ticket resolved two days ago", async () => {
    render(<HelpPanel ticketId="tk-resolved" />);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/^You can reopen until /)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen" }));
    await waitFor(() => expect(service.reopen).toHaveBeenCalledWith("tk-resolved"));
    expect(await within(dialog).findByText("Open")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("shows the 409 when the server refuses a reopen after the window", async () => {
    service.reopen.mockRejectedValueOnce(ApiError.fromResponse({ status: 409 }, null));
    render(<HelpPanel ticketId="tk-resolved" />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: "Reopen" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This ticket was resolved more than 7 days ago, so it can't be reopened. Raise a new ticket and mention TS-9WX4A.",
    );
  });

  it("offers no Reopen ten days after resolving, only the reason and a new ticket", async () => {
    render(<HelpPanel ticketId="tk-old" />);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/resolved more than 7 days ago, so it can't be reopened\. Raise a new ticket and mention TS-2BN6R\./)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "New ticket" }));
    expect(await screen.findByRole("heading", { name: "How can we help?" })).toBeInTheDocument();
  });

  it("closes the ticket after a confirm step, and then takes no replies", async () => {
    render(<HelpPanel ticketId="tk-open" />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: "Close ticket" }));
    const confirm = within(dialog).getByRole("button", { name: "Yes, close ticket" });
    expect(confirm).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep it open" }));
    expect(service.close).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close ticket" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, close ticket" }));
    await waitFor(() => expect(service.close).toHaveBeenCalledWith("tk-open"));
    expect(await within(dialog).findByText("This ticket is closed, so it takes no more replies. Raise a new ticket if you still need help.")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Your reply")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Closed")).toBeInTheDocument();
  });
});

describe("New ticket", () => {
  /**
   * Opens the new-ticket sheet.
   *
   * @returns Its dialog.
   */
  async function openNew() {
    render(<HelpPanel />);
    await ticketList();
    fireEvent.click(screen.getByRole("button", { name: "New ticket" }));
    return screen.findByRole("dialog");
  }

  it("sends a teacher's ticket to Talim support only, with no desk choice", async () => {
    const dialog = await openNew();
    expect(within(dialog).getByRole("group", { name: "Send to" })).toHaveTextContent("Talim support");
    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent("This goes to the Talim support team, not your school.");
    const areas = within(dialog).getByRole("group", { name: "What is it about?" });
    expect(within(areas).getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Grading",
      "Attendance",
      "Timetable",
      "Messages",
      "Results",
      "Signing in",
      "Something else",
    ]);
  });

  it("checks the fields on Send and focuses the first that needs attention", async () => {
    const dialog = await openNew();
    fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "ab" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send to Talim support" }));

    expect(within(dialog).getByText("Choose what it is about")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Subject")).toHaveAccessibleDescription("2 / 140 Write a subject of at least 3 characters");
    expect(within(dialog).getByLabelText("Message")).toHaveAccessibleDescription("0 / 5,000 Write a message");
    expect(within(within(dialog).getByRole("group", { name: "What is it about?" })).getByRole("button", { name: "Grading" })).toHaveFocus();
    expect(service.create).not.toHaveBeenCalled();
  });

  it("raises the ticket with its files, then opens its thread", async () => {
    const dialog = await openNew();
    fireEvent.click(within(dialog).getByRole("button", { name: "Signing in" }));
    fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "  Locked out after the update " } });
    fireEvent.change(within(dialog).getByLabelText("Message"), { target: { value: "It says my password expired." } });
    const file = new File(["png"], "screen.png", { type: "image/png" });
    fireEvent.change(dialog.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
    expect(within(dialog).getByRole("list", { name: "Files to send" })).toHaveTextContent("screen.png");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send to Talim support" }));

    await waitFor(() =>
      expect(service.create).toHaveBeenCalledWith({
        desk: "talim",
        area: "signing_in",
        subject: "Locked out after the update",
        body: "It says my password expired.",
        attachments: [{ url: "https://files.test/screen.png", name: "screen.png", mimeType: "image/png", size: 3 }],
      }),
    );
    expect(await screen.findByRole("heading", { name: "Locked out after the update" })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/settings?tab=help&ticket=tk-new-1", { scroll: false });
  });

  it("keeps the draft and says why when sending fails", async () => {
    service.create.mockRejectedValueOnce(ApiError.fromResponse({ status: 503 }, { error: { code: "SERVICE_UNAVAILABLE", message: "Support is unavailable right now" } }));
    const dialog = await openNew();
    fireEvent.click(within(dialog).getByRole("button", { name: "Grading" }));
    fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "Scores vanish" } });
    fireEvent.change(within(dialog).getByLabelText("Message"), { target: { value: "They were there yesterday." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send to Talim support" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Support is unavailable right now");
    expect(within(dialog).getByLabelText("Subject")).toHaveValue("Scores vanish");
  });
});
