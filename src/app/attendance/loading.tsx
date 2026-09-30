import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * Attendance while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading attendance" blocks={[110]} tiles={5} />;
}
