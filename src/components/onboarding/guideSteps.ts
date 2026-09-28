"use client";

import {
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Calculator,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileUp,
  GraduationCap,
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
    id: "resources",
    pathMatchers: ["/resources"],
    exactOnly: true,
    steps: [
      {
        target: "resources-header",
        eyebrow: "Teaching materials",
        title: "Resource Module",
        description:
          "Upload PDFs, videos, and learning materials so students can access them anytime from their e-library.",
        icon: FileUp,
      },
      {
        target: "resources-upload-button",
        title: "Upload a Resource",
        description:
          "Start here to choose the class, course, and file before publishing the material to students.",
        icon: FileUp,
      },
      {
        target: "resources-stats",
        title: "Track Coverage",
        description:
          "These cards show how many resources you have shared and whether your assigned classes are covered.",
        icon: BookOpen,
      },
      {
        target: "resources-list",
        title: "Manage Shared Files",
        description:
          "Review uploaded resources, open files, edit details, or remove materials that should no longer be available.",
        icon: Search,
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
        target: "grading-header",
        eyebrow: "Academic results",
        title: "Grading Flow",
        description:
          "Talim grading moves from assessment scores to course grades, then class term results after course grades are ready.",
        icon: GraduationCap,
      },
      {
        target: "grading-kpis",
        title: "Track Grading Progress",
        description:
          "Use the summary cards to see grading activity, average performance, and work still waiting for review.",
        icon: BarChart3,
      },
      {
        target: "grading-role-switch",
        title: "Choose Your Responsibility",
        description:
          "Course Teachers enter assessment scores and generate course grades. Class Teachers combine course grades into term summaries.",
        icon: UsersRound,
      },
      {
        target: "course-grading-shell",
        eyebrow: "Course teacher",
        title: "Course Teacher Workflow",
        description:
          "Start by choosing a course and term, then grade assessments for the students assigned to that course.",
        icon: BookOpen,
      },
      {
        target: "course-grading-course-selector",
        title: "Select the Course",
        description:
          "Pick the exact course you teach. The selected course determines which students and course grades are loaded.",
        icon: BookOpen,
      },
      {
        target: "course-grading-term-selector",
        title: "Select the Term",
        description:
          "Grades are term-based, so assessment scores and generated course grades belong to the selected academic term.",
        icon: ClipboardCheck,
      },
      {
        target: "course-grading-tabs",
        title: "Move Between Assessments and Course Grades",
        description:
          "Use Assessments to enter scores, then Course Grades to review cumulative course results for the term.",
        icon: Lightbulb,
      },
      {
        target: "course-grading-assessment-list",
        title: "Open an Assessment",
        description:
          "Choose an active assessment and enter scores for each student in that assessment.",
        icon: PencilRuler,
      },
      {
        target: "assessment-grading-header",
        title: "Assessment Grade Entry",
        description:
          "This is where the course teacher records student scores and sets the max score for the assessment.",
        icon: PencilRuler,
      },
      {
        target: "assessment-max-score",
        title: "Set Max Score",
        description:
          "The max score can be set by the teacher for the assessment, then reused across students while grading.",
        icon: Calculator,
      },
      {
        target: "assessment-progress",
        title: "Check Who Is Still Pending",
        description:
          "The progress panel shows how many students have been graded and who still needs a score.",
        icon: BarChart3,
      },
      {
        target: "assessment-student-list",
        title: "Select a Student",
        description:
          "Pick a student to view their assessment history, enter the current score, and manage their course grade record.",
        icon: UsersRound,
      },
      {
        target: "assessment-current-grade",
        title: "Enter the Assessment Score",
        description:
          "Record the actual score and max score, then save the assessment grade for that student.",
        icon: PencilRuler,
      },
      {
        target: "assessment-course-grade-record",
        title: "Generate Course Grade",
        description:
          "After assessment scores exist, generate the student's cumulative course grade for the term.",
        icon: Calculator,
      },
      {
        target: "assessment-generate-course-grades",
        title: "Generate in Bulk",
        description:
          "When multiple students are ready, generate course grade records for everyone eligible at once.",
        icon: Send,
      },
      {
        target: "course-grades-overview",
        title: "Review Course Grades",
        description:
          "Course Grades shows the cumulative course result each student has for the selected term.",
        icon: Award,
      },
      {
        target: "class-grading-shell",
        eyebrow: "Class teacher",
        title: "Class Teacher Workflow",
        description:
          "Class Teachers use generated course grades to create class-level term summaries.",
        icon: UsersRound,
      },
      {
        target: "class-grading-selectors",
        title: "Choose Class and Term",
        description:
          "Pick the class and term whose results you want to compile.",
        icon: ClipboardCheck,
      },
      {
        target: "class-grading-generate",
        title: "Generate Class Summary",
        description:
          "This combines available course grade records into student cumulative term records and a class term summary.",
        icon: Calculator,
      },
      {
        target: "class-grading-summary",
        title: "Review Term Summary",
        description:
          "After generation, the summary shows class average, total students, top performers, and students needing attention.",
        icon: BarChart3,
      },
      {
        target: "class-grading-student-list",
        title: "Review Student Results",
        description:
          "Student rows show generated grade, percentage, position, or Pending when course grades are not ready yet.",
        icon: UsersRound,
      },
      {
        target: "student-grade-summary",
        title: "Student Grade Summary",
        description:
          "Open a student to inspect their course grades and generate or recalculate their cumulative term report.",
        icon: Award,
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
