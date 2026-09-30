import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * Students while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading students" chips={3} tiles={4} blocks={[460]} />;
}
