import React from "react";
import Layout from "@/components/Layout";
import { PageSkeleton, type PageSkeletonProps } from "./PageSkeleton";

/**
 * A route's loading state (`loading.tsx`): the shell (sidebar and top bar)
 * with a {@link PageSkeleton} in the page's shape, so moving between pages
 * never flashes an empty screen.
 *
 * @param props - See {@link PageSkeletonProps}.
 * @returns The shell with the skeleton.
 */
export function RouteLoading(props: PageSkeletonProps) {
  return (
    <Layout>
      <PageSkeleton {...props} />
    </Layout>
  );
}
