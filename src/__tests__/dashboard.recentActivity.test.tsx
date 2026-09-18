/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { useDashboardStyles } from "@/components/dashboard/primitives";
import type { DashboardActivity } from "@/types/dashboard";

jest.mock("@/providers/theme-provider", () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      bg: "#fff",
      surface: "#fff",
      surfaceAlt: "#f5f5f5",
      primary: "#003366",
      text: "#111",
      textSecondary: "#333",
      textTertiary: "#999",
      border: "#eee",
      borderLight: "#eee",
      success: "#0a0",
      warning: "#fa0",
      error: "#f00",
    },
  }),
}));

/** Renders {@link RecentActivityCard} with a real theme-styles object. */
function Harness({ activity }: { activity: DashboardActivity[] }) {
  const styles = useDashboardStyles();
  return <RecentActivityCard styles={styles} activity={activity} />;
}

describe("RecentActivityCard", () => {
  it("renders an empty state with no real activity, never a placeholder list", () => {
    render(<Harness activity={[]} />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("renders each real event with a relative time", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    render(
      <Harness
        activity={[{ type: "resource", label: 'Resource "Algebra Worksheet" uploaded', timestamp: fiveMinutesAgo, href: "/resources" }]}
      />,
    );
    expect(screen.getByText('Resource "Algebra Worksheet" uploaded')).toBeInTheDocument();
    expect(screen.getByText("5 min ago")).toBeInTheDocument();
  });

  it("sorts nothing itself -- it trusts the order the server already returned", () => {
    const activity: DashboardActivity[] = [
      { type: "attendance", label: "Attendance recorded", timestamp: new Date().toISOString() },
      { type: "grading", label: "Results published", timestamp: new Date().toISOString() },
    ];
    render(<Harness activity={activity} />);
    const rows = screen.getAllByText(/recorded|published/);
    expect(rows[0]).toHaveTextContent("Attendance recorded");
    expect(rows[1]).toHaveTextContent("Results published");
  });
});
