/**
 * @jest-environment jsdom
 */
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import SetPasswordPage from "@/app/set-password/page";
import SignInRedirect from "@/app/signin/page";
import { SIGN_IN_ROUTE } from "@/lib/routes";

const replace = jest.fn();
const redirect = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  redirect: (to: string) => redirect(to),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/hooks/useAuth", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock("@/app/services/auth.service", () => ({ authService: { changePassword: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("the sign-in entry", () => {
  it("is the root page, the one that has the sign-in form", () => {
    expect(SIGN_IN_ROUTE).toBe("/");
  });

  it("sends a signed-out visitor of /set-password to the sign-in page", () => {
    render(<SetPasswordPage />);
    expect(replace).toHaveBeenCalledWith(SIGN_IN_ROUTE);
  });

  it("does the same when the stored session is unreadable", () => {
    localStorage.setItem("user", "{not json");
    render(<SetPasswordPage />);
    expect(replace).toHaveBeenCalledWith(SIGN_IN_ROUTE);
  });

  it("forwards /signin to the sign-in page instead of rendering a second form", () => {
    SignInRedirect();
    expect(redirect).toHaveBeenCalledWith(SIGN_IN_ROUTE);
  });

  it("is the only sign-in path in the source: nothing else names /signin", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
        } else if (/\.tsx?$/.test(entry.name) && !full.includes(`${path.sep}signin${path.sep}`)) {
          if (/["'`]\/signin["'`]/.test(fs.readFileSync(full, "utf8"))) offenders.push(path.relative(process.cwd(), full));
        }
      }
    };
    walk(path.join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});
