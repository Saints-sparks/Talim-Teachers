import { redirect } from "next/navigation";
import { resourcesRedirectHref, type RouteSearchParams } from "@/hooks/subjects/legacyRoutes";

/**
 * The old Resources page. Subjects now holds every subject's resources (with
 * upload, visibility, the week and Remove), so old links and bookmarks land
 * on its Resources tab, keeping `courseId`, `week` and `upload=1`
 * (see {@link resourcesRedirectHref}).
 *
 * @param props - What Next passes a page.
 * @param props.searchParams - The old link's query.
 * @returns Nothing; it redirects.
 */
export default async function ResourcesRedirect({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  redirect(resourcesRedirectHref(await searchParams));
}
