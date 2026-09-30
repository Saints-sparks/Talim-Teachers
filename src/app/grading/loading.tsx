import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * Grading while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading grading" chips={4} blocks={[520]} />;
}
