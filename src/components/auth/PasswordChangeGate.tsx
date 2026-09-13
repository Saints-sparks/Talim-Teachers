"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Routes a teacher with a temporary password may still visit. */
const OPEN_ROUTES = new Set(["/", "/signin", "/forgot-password", "/set-password"]);

/**
 * Keeps a teacher who must replace a temporary password on the set-password
 * screen, whichever URL they open. The API enforces the same rule
 * (`PASSWORD_CHANGE_REQUIRED`); this avoids rendering pages that would only
 * fail to load.
 */
export default function PasswordChangeGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (OPEN_ROUTES.has(pathname)) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null");
      if (user?.mustChangePassword) router.replace("/set-password");
    } catch {
      /* unreadable storage: let the page's own auth handling decide */
    }
  }, [pathname, router]);

  return null;
}
