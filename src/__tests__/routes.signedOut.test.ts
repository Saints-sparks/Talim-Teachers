import { SIGN_IN_ROUTE, isSignedOutRoute } from "@/lib/routes";

describe("isSignedOutRoute", () => {
  it("is true for sign-in and the forgotten-password page, with or without a trailing slash", () => {
    expect(isSignedOutRoute(SIGN_IN_ROUTE)).toBe(true);
    expect(isSignedOutRoute("/forgot-password")).toBe(true);
    expect(isSignedOutRoute("/forgot-password/")).toBe(true);
  });

  it("is false for the portal's pages and the temporary-password page (which needs a session)", () => {
    for (const path of ["/dashboard", "/settings", "/set-password", "/signin", "/forgot-password-x", "/messages"]) {
      expect(isSignedOutRoute(path)).toBe(false);
    }
  });
});
