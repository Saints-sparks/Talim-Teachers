/**
 * Every destination in the teacher sidebar (src/components/Sidebar.tsx: Teach,
 * Classes and Inbox), with text only the loaded page shows. The sidebar
 * contains every page's name, so a heading proves nothing; seeded data or the
 * empty-state copy does.
 */
export interface PageSpec {
  path: string;
  /** Seeded data, or the empty-state sentence when the seed leaves the page empty. */
  content: RegExp;
  /** True when `content` is an empty state (the seed has no data for this page). */
  empty?: boolean;
  /** The sidebar link's label. */
  label: string;
  /** The API call that feeds the page, when it has its own (checked for a 2xx answer). */
  feed?: RegExp;
}

export const TEACHER_PAGES: readonly PageSpec[] = [
  { path: "/dashboard", label: "Today", content: /Good (morning|afternoon|evening), Tolu/, feed: /\/teachers\/today$/ },
  { path: "/timetable", label: "Timetable", content: /Mathematics 5A · Grade 5A/, feed: /\/timetable\/me(\?|$)/ },
  { path: "/attendance", label: "Attendance", content: /Select a class to manage attendance/ },
  { path: "/grading", label: "Grading", content: /Grading Workspace/ },
  { path: "/students", label: "Students", content: /2 students/ },
  { path: "/subjects", label: "Subjects", content: /MTH-5A/ },
  { path: "/curriculum", label: "Curriculum", content: /Select a Course First/ },
  { path: "/resources", label: "Resources", content: /No resources yet/, empty: true },
  // The seed makes a Grade 5A class-group room (the lesson sheet's "Message the class").
  { path: "/messages", label: "Messages", content: /Class Group Chat/ },
  { path: "/notifications", label: "Notifications", content: /Grades published: First Term CA 1/ },
  { path: "/settings", label: "Settings", content: /Manage your account/ },
];
