/**
 * @jest-environment jsdom
 *
 * The app-level route states in the redesign: the 404, the error boundary
 * (and the global one) and the route skeletons.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotFound from "@/app/not-found";
import RouteError from "@/app/error";
import { PageSkeleton } from "@/components/tl/PageSkeleton";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

describe("the 404 page", () => {
  it("says what happened in the redesign's card and offers Today and Subjects", () => {
    render(<NotFound />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByText(/the scheme of work and resources now live in Subjects/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Today" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Open Subjects" })).toHaveAttribute("href", "/subjects");
    expect(screen.getByRole("link", { name: "support@mytalim.com" })).toHaveAttribute("href", "mailto:support@mytalim.com");
  });
});

describe("the error boundary", () => {
  it("shows the card, logs the error, and Try again re-renders the page", async () => {
    const reset = jest.fn();
    const error = Object.assign(new Error("Cannot read properties of undefined"), { digest: "4127735512" });
    render(<RouteError error={error} reset={reset} />);

    expect(screen.getByRole("heading", { level: 1, name: "This page could not be shown" })).toBeInTheDocument();
    // The developer's message is not shown; the reference is.
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
    expect(screen.getByText("4127735512")).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith("route", "a page failed to render", error);

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Go to Today" })).toHaveAttribute("href", "/dashboard");
  });

  it("leaves the reference out when the error has none", () => {
    render(<RouteError error={new Error("boom")} reset={jest.fn()} />);
    expect(screen.queryByText(/quote reference/)).not.toBeInTheDocument();
  });

  it("has a global boundary that brings its own document", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const element = GlobalError({ error: new Error("layout failed"), reset: jest.fn() });
    expect(element.type).toBe("html");
  });
});

describe("the route skeleton", () => {
  it("is one busy status region named for the page, with chips, tiles and cards", () => {
    const { container } = render(<PageSkeleton label="Loading students" chips={3} tiles={4} blocks={[460, 120]} />);
    const status = screen.getByRole("status", { name: "Loading students" });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading students…");
    // Heading bars (2) + chips (3) + tiles (4) + cards (2).
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(11);
  });
});
