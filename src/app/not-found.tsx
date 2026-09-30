import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/tl/RouteStates";

export const metadata: Metadata = { title: "Page not found · Talim Teachers" };

/**
 * The app's 404 (any address with no page, and `notFound()` anywhere), in
 * the redesign's card.
 *
 * @returns The page.
 */
export default function NotFound() {
  return <NotFoundScreen />;
}
