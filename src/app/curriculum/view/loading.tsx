import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * A curriculum's read-only page while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading the curriculum" blocks={[480]} />;
}
