"use client";

import {
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileUp,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  PencilRuler,
  Phone,
  Printer,
  Search,
  Send,
  Sunrise,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

export type GuideStep = {
  target: string;
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
};

export type GuideConfig = {
  id: string;
  pathMatchers: string[];
  exactOnly?: boolean;
  /** Only for this `?mode=` of the page (the Grading class report); such a guide is found by {@link guideConfigFor}. */
  mode?: string;
  steps: GuideStep[];
};

export const guideConfigs: GuideConfig[] = [
  {
    id: "today",
    pathMatchers: ["/dashboard"],
    exactOnly: true,
    steps: [
      {
        target: "today-now",
        eyebrow: "Today",
        title: "The lesson you are in",
        description:
          "The navy card shows the lesson on now, or the next one, with this week's topic and the time left. Open it for quick actions: the register, the week's plan, a resource or the class group.",
        icon: Sunrise,
      },
      {
        target: "today-day",
        title: "Your day",
        description:
          "Every lesson today, period by period, with rooms and breaks. The lesson on now and the next one are tagged; select any lesson for its quick actions.",
        icon: CalendarDays,
      },
      {
        target: "today-attention",
        title: "Needs your attention",
        description:
          "Only what is outstanding, most urgent first: an open register (it turns red once it is overdue), scores to enter or publish, a parent waiting for a reply. Each item has one button that takes you there.",
        icon: BellRing,
      },
      {
        target: "today-setup",
        title: "Finish setting up",
        description: "A few short steps for your first weeks. Each one opens where you do it, and the card goes away once they are all done.",
        icon: ListChecks,
      },
    ],
  },
  {
    id: "timetable",
    pathMatchers: ["/timetable"],
    exactOnly: true,
    steps: [
      {
        target: "timetable-week-nav",
        eyebrow: "Timetable",
        title: "Move between weeks",
        description: "Step back or forward a week, or jump back to this week. The heading shows the week of term and how many lessons you have.",
        icon: CalendarDays,
      },
      {
        target: "timetable-lessons",
        title: "Open any lesson",
        description:
          "Every lesson opens quick actions: take the register, open the week's plan, share a resource or message the class group. A double period shows as one block.",
        icon: LayoutGrid,
      },
      {
        target: "timetable-view-toggle",
        title: "Week or today",
        description: "Show Monday to Friday, or only one day's periods. On a phone the timetable shows one day at a time.",
        icon: Lightbulb,
      },
      {
        target: "timetable-print",
        title: "Print or save",
        description: "Print the week, or save it as a PDF, on a clean light page. CSV downloads it as a spreadsheet.",
        icon: Printer,
      },
    ],
  },
  {
    id: "attendance",
    pathMatchers: ["/attendance"],
    exactOnly: true,
    steps: [
      {
        target: "attendance-controls",
        eyebrow: "Morning register",
        title: "Pick the class and the day",
        description:
          "Choose one of your classes and a school day. Past days are read-only, a weekend snaps back to Friday, and Back to today returns to this morning's register.",
        icon: CalendarDays,
      },
      {
        target: "attendance-stats",
        title: "Counts as you go",
        description:
          "Present, Late, Absent, On leave and Not marked update with every tap. Everyone has to be marked before the register can be submitted.",
        icon: BarChart3,
      },
      {
        target: "attendance-mark-all",
        title: "Mark the rest present",
        description:
          "Mark the few who are late or absent first, then mark everyone else present in one go. You can still change anyone afterwards.",
        icon: ListChecks,
      },
      {
        target: "attendance-rows",
        title: "Present, Late or Absent",
        description:
          "Tap a status for each student, or use the arrow keys. Students on leave approved by the office are already marked. An absence asks for a reason and an optional note for the office.",
        icon: UsersRound,
      },
      {
        target: "attendance-submit",
        title: "Submit the register",
        description:
          "Your marks save as a draft as you go. Submit once everyone is marked: that is when parents of absent students are told. You can reopen it with Edit register until the afternoon.",
        icon: Send,
      },
    ],
  },
  {
    id: "attendance-class",
    pathMatchers: ["/attendance/class"],
    steps: [
      {
        target: "attendance-register",
        eyebrow: "Today's register",
        title: "The register you opened",
        description:
          "This is the class register you opened from Today. Everyone who needs a mark is listed, and students on approved leave are already filled in.",
        icon: ClipboardCheck,
      },
      {
        target: "attendance-rows",
        title: "One tap per student",
        description:
          "Choose Present, Late or Absent for each student (arrow keys work too). An absence asks for a reason, and you can leave a note for the school office.",
        icon: UsersRound,
      },
      {
        target: "attendance-mark-all",
        title: "Mark the rest present",
        description: "Once the few exceptions are marked, mark everyone else present in one go.",
        icon: ListChecks,
      },
      {
        target: "attendance-submit",
        title: "Submit before it closes",
        description:
          "Marks save as a draft as you go. Submit when everyone is marked; parents of absent students are notified then, and Today stops showing the register.",
        icon: Send,
      },
      {
        target: "attendance-controls",
        title: "Another class or day",
        description: "Switch class or look back at an earlier school day here. Past registers are read-only.",
        icon: CalendarDays,
      },
    ],
  },
  {
    id: "attendance-history",
    pathMatchers: ["/analytics/attendance"],
    exactOnly: true,
    steps: [
      {
        target: "history-filters",
        eyebrow: "Attendance history",
        title: "Pick a class and a period",
        description:
          "Choose one of your classes, then this week, this month or this term, or type any From and To up to today. The address keeps what you picked, so you can bookmark or share it.",
        icon: CalendarDays,
      },
      {
        target: "history-stats",
        title: "The class over the period",
        description:
          "Its attendance rate, the present, late, absent and leave days, and how many students are below 90%. Late counts as attended; leave approved by the office does not count against the rate.",
        icon: BarChart3,
      },
      {
        target: "history-students",
        title: "Student by student",
        description:
          "Each student's rate and days. Sort by lowest attendance first to see who needs a word, search by name, or open a student's record.",
        icon: UsersRound,
      },
    ],
  },
  {
    id: "curriculum",
    pathMatchers: ["/curriculum"],
    exactOnly: true,
    steps: [
      {
        target: "curriculum-header",
        eyebrow: "Lesson planning",
        title: "Create or Edit Curriculum",
        description:
          "Curriculum is your structured plan for a course in the current term, including notes, topics, links, and attachments.",
        icon: PencilRuler,
      },
      {
        target: "curriculum-primary-action",
        title: "Choose or Create",
        description:
          "Select a course first, then create a new curriculum or edit the existing plan for that course and term.",
        icon: BookOpen,
      },
      {
        target: "curriculum-list",
        title: "Review Existing Plans",
        description:
          "Open curriculum cards to preview the plan, edit it, download it, or remove outdated content.",
        icon: Search,
      },
    ],
  },
  {
    id: "curriculum-editor",
    pathMatchers: ["/curriculum"],
    steps: [
      {
        target: "curriculum-editor-header",
        eyebrow: "Editor guide",
        title: "Curriculum Editor",
        description:
          "This editor is where you turn the course plan into readable learning content for students.",
        icon: PencilRuler,
      },
      {
        target: "curriculum-editor-config",
        title: "Confirm Course and Term",
        description:
          "The side panel confirms the course, active term, attachments, and whether the curriculum is ready to save.",
        icon: BookOpen,
      },
      {
        target: "curriculum-editor-toolbar",
        title: "Format the Lesson Plan",
        description:
          "Use the toolbar for headings, emphasis, lists, tables, images, links, alignment, colors, undo, and redo.",
        icon: PencilRuler,
      },
      {
        target: "curriculum-editor-canvas",
        title: "Write the Content",
        description:
          "Add the actual curriculum body here: weekly topics, learning outcomes, activities, references, and teacher notes.",
        icon: Lightbulb,
      },
      {
        target: "curriculum-editor-actions",
        title: "Save When Ready",
        description:
          "The readiness message helps confirm that the course, term, and content are present before saving.",
        icon: Send,
      },
    ],
  },
  {
    id: "students",
    pathMatchers: ["/students"],
    exactOnly: true,
    steps: [
      {
        target: "students-tabs",
        eyebrow: "Your classes",
        title: "One tab per class",
        description: "Every class you teach, with your role in it. Classes you are class teacher of come first.",
        icon: UsersRound,
      },
      {
        target: "students-stats",
        title: "The class at a glance",
        description:
          "Students against capacity, attendance this term, who is absent today once the register is in, and what you teach here.",
        icon: BarChart3,
      },
      {
        target: "students-search",
        title: "Find a student",
        description: "Search by name, admission number, email or guardian.",
        icon: Search,
      },
      {
        target: "students-table",
        title: "Open a student's record",
        description:
          "Select a student for their details, guardian contacts, attendance this term and scores in the subjects you teach them.",
        icon: BookOpen,
      },
      {
        target: "students-export",
        title: "Export the class list",
        description: "Download the class with admission numbers, attendance rates and guardian contacts as a spreadsheet.",
        icon: Download,
      },
    ],
  },
  {
    id: "student-profile",
    pathMatchers: ["/students/"],
    steps: [
      {
        target: "student-header",
        eyebrow: "Student record",
        title: "Details from the school office",
        description: "Name, class, admission number, date of birth and email, as the school office holds them.",
        icon: UsersRound,
      },
      {
        target: "student-guardian",
        title: "Reach the guardian",
        description: "Call from your phone, or Message to open a direct conversation with the guardian in Messages.",
        icon: Phone,
      },
      {
        target: "student-attendance",
        title: "Attendance this term",
        description: "The attendance rate and the days present, late, absent and on leave so far. Approved leave does not count against the rate.",
        icon: CalendarDays,
      },
      {
        target: "student-scores",
        title: "Scores in your subjects",
        description:
          "Each assessment in the subjects you teach this student, with the class average marked on the bar. Grade and position appear once every assessment is in.",
        icon: Award,
      },
    ],
  },
  {
    id: "grading",
    pathMatchers: ["/grading"],
    exactOnly: true,
    steps: [
      {
        target: "grading-mode-switch",
        eyebrow: "Grading",
        title: "Subject scores or class report",
        description:
          "Subject scores is where you enter the scores for the subjects you teach. As a class teacher you also have Class report, to follow your colleagues and compile the report.",
        icon: UsersRound,
      },
      {
        target: "grading-course-chips",
        title: "Pick a subject",
        description: "One chip per subject and class you teach. A dot means there are scores you have not saved yet.",
        icon: BookOpen,
      },
      {
        target: "grading-assessment-tabs",
        title: "One assessment at a time",
        description:
          "Each assessment the school set this term, with its maximum, its due date and how far you are: Not started, Draft, Published or Unlocked. Term total shows them all side by side.",
        icon: ClipboardCheck,
      },
      {
        target: "grading-score-sheet",
        title: "Type scores straight in",
        description:
          "Enter moves down the column. Anything above the maximum turns red, and the percentage, grade and running total update as you type. Save a draft as often as you like; only you can see it.",
        icon: PencilRuler,
      },
      {
        target: "grading-publish",
        title: "Publish when everyone has a score",
        description:
          "Publish shows the scores to students and parents and notifies them, then the scores lock. If you spot a mistake, Unlock to correct, fix it and publish again: only the families whose scores changed are told.",
        icon: Send,
      },
      {
        target: "grading-term",
        title: "Earlier terms",
        description: "Switch term to look back at, or finish, the scores of an earlier term.",
        icon: CalendarDays,
      },
    ],
  },
  {
    id: "grading-class",
    pathMatchers: ["/grading"],
    exactOnly: true,
    mode: "class",
    steps: [
      {
        target: "grading-mode-switch",
        eyebrow: "Class report",
        title: "Your class, as class teacher",
        description: "Class report brings every subject of your class together. Switch back to Subject scores for the subjects you teach yourself.",
        icon: UsersRound,
      },
      {
        target: "grading-readiness",
        title: "Who has published",
        description:
          "Each subject's status for each assessment. Open takes you to your own scores; Send reminder nudges a colleague about the first assessment they have not published, once a day.",
        icon: BellRing,
      },
      {
        target: "grading-tab-summary",
        title: "The summary broadsheet",
        description:
          "Every student's published scores in every subject, with average, position and grade, for one assessment or the term total. Print it, and generate the summary for the school office once every subject has published.",
        icon: BarChart3,
      },
      {
        target: "grading-tab-remarks",
        title: "Remarks for each report card",
        description:
          "Write a short remark for each student; it saves as you type. Remarks lock while the results are with the school office, and the principal's remark shows under yours.",
        icon: MessageSquareText,
      },
    ],
  },
  {
    id: "subjects",
    pathMatchers: ["/subjects"],
    exactOnly: true,
    steps: [
      {
        target: "subjects-cards",
        eyebrow: "Subjects",
        title: "One card per subject",
        description: "Every subject and class you teach, with how many lessons a week and how many weeks of the term you have taught. Select one to open it.",
        icon: BookOpen,
      },
      {
        target: "subjects-plan",
        title: "The term, week by week",
        description:
          "Each week's topic and objectives. This week is highlighted, and weeks without objectives say so. Edit a week to write its topic and objectives.",
        icon: CalendarDays,
      },
      {
        target: "subjects-mark-taught",
        title: "Mark a week taught",
        description: "Record each week once you have covered it; Undo if you marked the wrong one. Today and the timetable show the same progress.",
        icon: ListChecks,
      },
      {
        target: "subjects-tab-resources",
        title: "Resources for the class",
        description: "Everything you have shared for this subject, with the week it belongs to, who can see it and how many have opened it.",
        icon: FileUp,
      },
      {
        target: "subjects-upload",
        title: "Share a resource",
        description:
          "Upload a worksheet, slides or a video, file it under a week, and choose whether parents can see it too. Students see it in their portal straight away.",
        icon: Send,
      },
    ],
  },
  {
    id: "messages",
    pathMatchers: ["/messages"],
    exactOnly: true,
    steps: [
      {
        target: "messages-shell",
        eyebrow: "Communication",
        title: "Chat and Messaging",
        description:
          "Use messages to coordinate with students and groups while keeping classroom conversations organized.",
        icon: MessageSquareText,
      },
      {
        target: "messages-search",
        title: "Find Conversations",
        description:
          "Search and filters help separate direct chats from group conversations when the inbox gets busy.",
        icon: Search,
      },
      {
        target: "messages-create-group",
        title: "Create a Group",
        description:
          "Start a group chat when a class or project needs one shared conversation space.",
        icon: UsersRound,
      },
      {
        target: "messages-list",
        title: "Open a Thread",
        description:
          "Select a conversation to view message history, unread counts, participants, and live updates.",
        icon: MessageSquareText,
      },
      {
        target: "messages-chat-area",
        title: "Reply and Share",
        description:
          "Use the message box to send replies and attach supporting files when the conversation needs context.",
        icon: Send,
      },
    ],
  },
];

export function findGuideConfig(pathname: string) {
  return guideConfigs
    .filter((config) => !config.mode)
    .filter((config) =>
      config.pathMatchers.some(
        (matcher) =>
          pathname === matcher ||
          (!config.exactOnly && pathname.startsWith(matcher))
      )
    )
    .sort((a, b) => {
      const longestA = Math.max(...a.pathMatchers.map((matcher) => matcher.length));
      const longestB = Math.max(...b.pathMatchers.map((matcher) => matcher.length));
      return longestB - longestA;
    })[0];
}

/**
 * The guide for a page and its query: the curriculum editor while
 * `/curriculum?mode=create|edit` is open, a guide declared for the page's
 * `?mode=` (Grading's class report), else the page's own guide.
 *
 * @param pathname - The path.
 * @param params - The query string.
 * @returns The guide, if the page has one.
 */
export function guideConfigFor(pathname: string, params: Pick<URLSearchParams, "get"> | null | undefined): GuideConfig | undefined {
  const mode = params?.get("mode") ?? null;
  if (pathname === "/curriculum" && (mode === "create" || mode === "edit")) {
    return guideConfigs.find((guide) => guide.id === "curriculum-editor");
  }
  if (mode) {
    const moded = guideConfigs.find((config) => config.mode === mode && config.pathMatchers.some((matcher) => pathname === matcher || (!config.exactOnly && pathname.startsWith(matcher))));
    if (moded) return moded;
  }
  return findGuideConfig(pathname);
}
