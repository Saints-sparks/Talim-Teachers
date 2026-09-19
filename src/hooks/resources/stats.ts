import { refId, type Resource, type ResourceClass } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The numbers on the three cards above the resource list. */
export interface ResourceStats {
  totalResources: number;
  /** Uploaded in the last 7 days. */
  thisWeekResources: number;
  /** Uploaded in the last 3 days. */
  recentResources: number;
  /** Distinct classes the resources are filed under. */
  uniqueClasses: number;
  /** Classes the teacher is assigned to. */
  totalAssignedClasses: number;
}

/**
 * The summary the resource page shows, computed from the list already loaded
 * (the API has no aggregate for it).
 *
 * @param resources - The teacher's resources.
 * @param assignedClassCount - How many classes the teacher is assigned to.
 * @param now - The current time; injectable so tests do not depend on the clock.
 * @returns The card figures. A resource with an unreadable date counts toward
 *   the total but not toward the week or recent figures.
 */
export function computeResourceStats(resources: Resource[], assignedClassCount: number, now: Date = new Date()): ResourceStats {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const threeDaysAgo = now.getTime() - 3 * DAY_MS;

  let thisWeek = 0;
  let recent = 0;
  const classIds = new Set<string>();

  for (const resource of resources) {
    const uploaded = new Date(resource.uploadDate).getTime();
    if (!Number.isNaN(uploaded)) {
      if (uploaded >= weekAgo && uploaded <= now.getTime()) thisWeek++;
      if (uploaded >= threeDaysAgo) recent++;
    }
    const classId = refId(resource.classId as ResourceClass | string | null | undefined);
    if (classId) classIds.add(classId);
  }

  return {
    totalResources: resources.length,
    thisWeekResources: thisWeek,
    recentResources: recent,
    uniqueClasses: classIds.size,
    totalAssignedClasses: assignedClassCount,
  };
}

/**
 * Filters resources by a search box, case-insensitively on the name.
 *
 * @param resources - The resources.
 * @param term - What the teacher typed.
 * @returns The resources whose name contains the term; all of them for a blank term.
 */
export function filterResources(resources: Resource[], term: string): Resource[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return resources;
  return resources.filter((resource) => resource.name.toLowerCase().includes(needle));
}
