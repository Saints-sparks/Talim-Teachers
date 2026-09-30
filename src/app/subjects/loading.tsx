import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * Subjects while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading subjects" tiles={3} blocks={[420]} />;
}
