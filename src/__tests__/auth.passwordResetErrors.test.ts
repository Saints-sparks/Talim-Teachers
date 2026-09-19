import { ApiError } from "@/lib/apiError";
import { describeResetFailure } from "@/hooks/auth/passwordResetErrors";

/**
 * A `VALIDATION_FAILED` error with one field problem, as the API sends it.
 *
 * @param field - The field that failed.
 * @param reason - The server's reason.
 * @returns The typed error.
 */
const invalid = (field: string, reason: string) => new ApiError("VALIDATION_FAILED", "Some fields need attention.", 400, [{ field, reason }]);

describe("describeResetFailure", () => {
  it("asks the teacher to wait when the reset routes are rate limited, at any stage", () => {
    const limited = new ApiError("RATE_LIMITED", "Too many requests", 429);
    for (const stage of ["request", "verify", "reset"] as const) {
      const failure = describeResetFailure(limited, stage);
      expect(failure.message).toMatch(/too many attempts/i);
      expect(failure.restartCode).toBe(false);
    }
  });

  it("shows the server's reason for a bad code, and only forces a new code once a password was being set", () => {
    const badCode = invalid("token", "The code is invalid or has expired");
    expect(describeResetFailure(badCode, "verify")).toEqual({ message: "The code is invalid or has expired", restartCode: false });
    expect(describeResetFailure(badCode, "reset")).toEqual({ message: "The code is invalid or has expired", restartCode: true });
  });

  it("shows a weak-password reason without discarding the code", () => {
    expect(describeResetFailure(invalid("newPassword", "Password needs a symbol"), "reset")).toEqual({
      message: "Password needs a symbol",
      restartCode: false,
    });
  });

  it("falls back to a stage-specific sentence for a code failure that names no field", () => {
    const bare = new ApiError("VALIDATION_FAILED", "Some fields need attention.", 400);
    expect(describeResetFailure(bare, "verify").message).toMatch(/invalid or has expired/i);
  });

  it("passes connectivity messages through, and never leaks raw errors", () => {
    expect(describeResetFailure(ApiError.offline(), "request").message).toMatch(/offline/i);
    expect(describeResetFailure(new TypeError("Failed to fetch"), "request").message).toBe("Failed to send reset code. Please try again.");
    expect(describeResetFailure("boom", "reset").message).toBe("Failed to reset password. Please try again.");
  });
});
