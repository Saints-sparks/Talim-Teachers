"use client";

import React from "react";
import Layout from "@/components/Layout";
import { SkeletonBlock, type DashboardStyles } from "./primitives";

/**
 * The dashboard's loading state: shaped like the real layout so nothing
 * jumps once the data arrives.
 *
 * @param props - The dashboard's theme styles.
 * @param props.styles - The dashboard's theme styles.
 * @returns The skeleton page element.
 */
export function DashboardSkeleton({ styles }: { styles: DashboardStyles }) {
  return (
    <Layout>
      <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8" style={styles.page}>
        <div role="status" aria-live="polite" aria-label="Loading dashboard" className="mx-auto max-w-[1280px] space-y-5">
          <SkeletonBlock className="h-24" styles={styles} />
          <SkeletonBlock className="h-24" styles={styles} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-36" styles={styles} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonBlock className="h-72" styles={styles} />
            <SkeletonBlock className="h-72" styles={styles} />
          </div>
        </div>
      </main>
    </Layout>
  );
}
