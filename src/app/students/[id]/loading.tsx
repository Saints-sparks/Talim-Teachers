import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * A student's record while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading the student record" blocks={[200, 220, 320]} />;
}
