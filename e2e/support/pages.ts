/**
 * Every destination in the teacher sidebar (src/components/Sidebar.tsx), with
 * text only the loaded page shows. The sidebar contains every page's name, so a
 * heading proves nothing; seeded data or the empty-state copy does.
 */
export interface PageSpec {
  path: string;
  /** Seeded data, or the empty-state sentence when the seed leaves the page empty. */
  content: RegExp;
  /** True when `content` is an empty state (the seed has no data for this page). */
  empty?: boolean;
}

export const TEACHER_PAGES: readonly PageSpec[] = [
  { path: "/dashboard", content: /Good (morning|afternoon|evening), Tolu/ },
  { path: "/students", content: /2 students/ },
  { path: "/subjects", content: /MTH-5A/ },
  { path: "/resources", content: /No resources yet/, empty: true },
  { path: "/timetable", content: /Mathematics 5A/ },
  { path: "/attendance", content: /Select a class to manage attendance/ },
  { path: "/grading", content: /Grading Workspace/ },
  { path: "/curriculum", content: /Select a Course First/ },
  { path: "/messages", content: /No chats yet/, empty: true },
  { path: "/notifications", content: /Grades published: First Term CA 1/ },
  { path: "/settings", content: /Manage your account/ },
];
