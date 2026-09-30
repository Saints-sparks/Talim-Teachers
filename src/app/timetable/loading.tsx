import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * The Timetable while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading the timetable" blocks={[560]} />;
}
