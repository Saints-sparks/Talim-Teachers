import { redirect } from "next/navigation";
import { SIGN_IN_ROUTE } from "@/lib/routes";

/** Old link to the sign-in page; the form lives at {@link SIGN_IN_ROUTE}. */
export default function SignInRedirect() {
  redirect(SIGN_IN_ROUTE);
}
