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
  { path: "/attendance", label: "Attendance", content: /Grade 5A · \w+ \d+ \w+ · today/, feed: /\/registers\/[a-f0-9]{24}(\?|$)/ },
  // Mathematics 5A's sheet (the teacher's first subject): its assessments are the tabs.
  { path: "/grading", label: "Grading", content: /First Term CA 1/, feed: /\/grading\/course\/[a-f0-9]{24}(\?|$)/ },
  { path: "/students", label: "Students", content: /2 of 30/, feed: /\/teachers\/me\/classes\/[a-f0-9]{24}\/students$/ },
  { path: "/subjects", label: "Subjects", content: /MTH-5A/, feed: /\/scheme-of-work\/me(\?|$)/ },
  // Without `?courseId=` the written curriculum asks for a subject (Subjects links to each one).
  { path: "/curriculum", label: "Curriculum", content: /Choose a subject first/, empty: true },
  // The seed makes a Grade 5A class-group room (the lesson sheet's "Message the class"); it is in the conversations list.
  { path: "/messages", label: "Messages", content: /Class Group Chat/ },
  // The Academics tab's count (the seed's publish and assessment notices). The newest-first list
  // itself fills with what every suite run sends, so a seeded item can fall off its first page.
  { path: "/notifications", label: "Notifications", content: /^Academics\s*\d+$/, feed: /\/notifications\/counts$/ },
  // Settings opens on Account: the teacher's email appears once their settings have loaded.
  { path: "/settings", label: "Settings", content: /teacher@e2e\.talim\.test/, feed: /\/teacher\/settings$/ },
];
