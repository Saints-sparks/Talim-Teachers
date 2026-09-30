import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * Attendance history while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading attendance history" blocks={[110]} tiles={6} />;
}
