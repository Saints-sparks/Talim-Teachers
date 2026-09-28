/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, within } from "@/test-utils/render";
import { TodayView } from "@/components/today/TodayView";
import { attentionText, registerButtonTip, registerDeadline } from "@/hooks/today/today.logic";
import { FIXTURE_NOW, makeTodayFixture } from "@/lib/fixtures/today.fixture";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const NOW = Date.parse(FIXTURE_NOW); // 10:25 in Lagos; registers close at 11:00
const lagos = (hhmm: string) => Date.parse(`2026-09-25T${hhmm}:00+01:00`);
const TZ = "Africa/Lagos";

describe("register deadline", () => {
  const reg = makeTodayFixture().registers[0];

  it("is open before closesAt and overdue after, on the school clock", () => {
    expect(registerDeadline(reg, NOW, TZ)).toEqual({ overdue: false, time: "11:00" });
    expect(registerDeadline(reg, lagos("11:00"), TZ)).toEqual({ overdue: true, time: "11:00" });
    expect(registerDeadline(reg, lagos("13:30"), TZ)?.overdue).toBe(true);
  });

  it("is never overdue once submitted, and null when closesAt is unreadable", () => {
    expect(registerDeadline({ ...reg, submittedAt: "2026-09-25T09:30:00.000Z" }, lagos("12:00"), TZ)?.overdue).toBe(false);
    expect(registerDeadline({ ...reg, closesAt: "soon" }, NOW, TZ)).toBeNull();
  });

  it("words the Take register tip by the deadline", () => {
    expect(registerButtonTip(reg, NOW, TZ)).toBe("Open today's register for JSS1 A · closes at 11:00");
    expect(registerButtonTip(reg, lagos("11:05"), TZ)).toBe("Register overdue for JSS1 A · closed at 11:00");
  });

  it("turns only the register attention item overdue", () => {
    const today = makeTodayFixture();
    const [registerItem, scoresItem] = today.attention;
    expect(attentionText(registerItem, today.registers, NOW, TZ)).toEqual({ description: registerItem.description, overdue: false });
    expect(attentionText(registerItem, today.registers, lagos("11:30"), TZ)).toEqual({
      description: "Register overdue · closed at 11:00",
      overdue: true,
    });
    expect(attentionText(scoresItem, today.registers, lagos("11:30"), TZ).overdue).toBe(false);
  });
});

describe("Today after the register closes", () => {
  it("shows the register item as overdue, in the danger tone, and the button tip says so", () => {
    render(<TodayView today={makeTodayFixture()} nowMs={lagos("11:20")} firstName="Seyi" onUpload={jest.fn()} />);
    const attention = screen.getByRole("region", { name: "Needs your attention" });
    const text = within(attention).getByText("Register overdue · closed at 11:00");
    expect(text).toHaveClass("text-tl-danger");
    expect(within(attention).queryByText(/closes at/)).not.toBeInTheDocument();
    expect(screen.getByTitle("Register overdue for JSS1 A · closed at 11:00")).toHaveAttribute("data-overdue", "true");
  });

  it("keeps the server's text before the close time", () => {
    render(<TodayView today={makeTodayFixture()} nowMs={NOW} firstName="Seyi" onUpload={jest.fn()} />);
    expect(screen.queryByText(/Register overdue/)).not.toBeInTheDocument();
  });
});

describe("class card", () => {
  it("says 'No students yet' for an empty class-teacher class instead of the register line", () => {
    const today = makeTodayFixture();
    today.classes[0] = { ...today.classes[0], studentCount: 0, attendanceRateTerm: null };
    render(<TodayView today={today} nowMs={NOW} firstName="Seyi" onUpload={jest.fn()} />);
    const card = screen.getByRole("region", { name: "JSS1 A" });
    expect(within(card).getByText("No students yet")).toBeInTheDocument();
    expect(within(card).queryByText("Today's register")).not.toBeInTheDocument();
    expect(within(card).queryByText("Not submitted")).not.toBeInTheDocument();
  });

  it("links Open class to that class's tab on Students", () => {
    render(<TodayView today={makeTodayFixture()} nowMs={NOW} firstName="Seyi" onUpload={jest.fn()} />);
    const card = screen.getByRole("region", { name: "JSS2 B" });
    expect(within(card).getByRole("link", { name: /Open class/ })).toHaveAttribute("href", "/students?classId=c2");
  });
});
