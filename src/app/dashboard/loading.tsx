import Layout from "@/components/Layout";
import { TodaySkeleton } from "@/components/today/TodayScreen";

/**
 * Today while its route loads: the shell with Today's own skeleton.
 *
 * @returns The loading state.
 */
export default function Loading() {
  return (
    <Layout>
      <TodaySkeleton />
    </Layout>
  );
}
