/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationDetail } from "@/components/notifications/NotificationDetail";
import { ApiError } from "@/lib/apiError";
import { normalizeSystemNotification, type TeacherNotification } from "@/app/lib/notifications/inbox";

const item: TeacherNotification = normalizeSystemNotification(
  { _id: "n1", title: "Class 1A absent", message: "Line one\nLine two", type: "attendance_alert", createdAt: "2026-09-10T08:00:00.000Z", readBy: [] },
  "u1",
);

const baseProps = { notifications: [], loading: false, error: null, partial: false, totalCount: 0, onSelect: jest.fn(), onRetry: jest.fn() };

describe("NotificationList states", () => {
  it("shows a skeleton, not a spinner with no way out, while loading", () => {
    render(<NotificationList {...baseProps} loading />);
    expect(screen.getByRole("status", { name: /loading notifications/i })).toBeInTheDocument();
  });

  it("keys the error on the failure's code and offers a retry only when a retry could help", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(<NotificationList {...baseProps} error={ApiError.offline()} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("You're offline");
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<NotificationList {...baseProps} error={new ApiError("FORBIDDEN", "No access", 403)} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("You don't have access to this");
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("distinguishes an empty inbox from a filter that matches nothing", () => {
    const { rerender } = render(<NotificationList {...baseProps} totalCount={0} />);
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();

    rerender(<NotificationList {...baseProps} totalCount={5} />);
    expect(screen.getByText("No notifications found")).toBeInTheDocument();
  });

  it("lists rows, reports selection, and warns when only part of the inbox loaded", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<NotificationList {...baseProps} notifications={[item]} totalCount={1} partial onSelect={onSelect} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't be loaded/i);
    await user.click(screen.getByText("Class 1A absent"));
    expect(onSelect).toHaveBeenCalledWith(item);
    expect(screen.getByText("Showing 1 of 1 notifications")).toBeInTheDocument();
  });
});

describe("NotificationDetail", () => {
  it("renders every line of the message and offers only actions that do something", async () => {
    const onMarkAsRead = jest.fn();
    const user = userEvent.setup();
    render(<NotificationDetail notification={item} onBack={jest.fn()} onMarkAsRead={onMarkAsRead} />);

    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Line two")).toBeInTheDocument();
    // Deleting a notification is a staff-only server action; the teacher UI no longer pretends otherwise.
    expect(screen.queryByLabelText(/delete notification/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark as read/i }));
    expect(onMarkAsRead).toHaveBeenCalled();
  });

  it("disables mark-as-read once the notification is read", () => {
    render(<NotificationDetail notification={{ ...item, unread: false }} onBack={jest.fn()} onMarkAsRead={jest.fn()} />);
    expect(screen.getByRole("button", { name: /mark as read/i })).toBeDisabled();
  });

  it("asks for a selection when nothing is open", () => {
    render(<NotificationDetail notification={null} onBack={jest.fn()} onMarkAsRead={jest.fn()} />);
    expect(screen.getByText("Select a notification")).toBeInTheDocument();
  });
});
