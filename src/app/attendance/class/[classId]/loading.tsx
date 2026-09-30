import { RouteLoading } from "@/components/tl/RouteLoading";

/**
 * A class register while its route loads: the shell with grey blocks in the page's shape.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return <RouteLoading label="Loading the register" blocks={[110]} tiles={5} />;
}
