import { redirect } from "next/navigation";
import { settingsHref } from "@/hooks/settings/settings.logic";

/**
 * The old Profile page. Everything it showed now lives in Settings → Account
 * (the editable name and phone, the photo, and the teacher record's classes,
 * subjects, qualifications, employment and availability), so old links and
 * bookmarks are forwarded there.
 *
 * @returns Never: `redirect` throws.
 */
export default function ProfileRedirect() {
  redirect(settingsHref("account"));
}
