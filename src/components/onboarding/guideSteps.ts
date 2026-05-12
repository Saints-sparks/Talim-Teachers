"use client";

import {
  BookOpen,
  ClipboardCheck,
  FileUp,
  Lightbulb,
  MessageSquareText,
  PencilRuler,
  Search,
  Send,
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
        target: "attendance-header",
        eyebrow: "Daily records",
        title: "Take Attendance",
        description:
          "Choose the class you are teaching, then mark each learner as present or absent for the day.",
        icon: ClipboardCheck,
      },
      {
        target: "attendance-search",
        title: "Find a Class Quickly",
        description:
          "Use search when your class list grows, especially if you teach multiple sections or subjects.",
        icon: Search,
      },
      {
        target: "attendance-class-grid",
        title: "Open the Class Register",
        description:
          "Each class card opens the attendance register where you can record, review, and refresh today's attendance.",
        icon: UsersRound,
      },
    ],
  },
  {
    id: "attendance-class",
    pathMatchers: ["/attendance/class"],
    steps: [
      {
        target: "attendance-register-header",
        eyebrow: "Class register",
        title: "Mark Today’s Attendance",
        description:
          "Use Mark for daily recording and View when you need to review the attendance status already submitted.",
        icon: ClipboardCheck,
      },
      {
        target: "attendance-mode-controls",
        title: "Switch Between Mark and View",
        description:
          "Mark records attendance for students; View summarizes what has already been recorded for the class.",
        icon: Lightbulb,
      },
      {
        target: "attendance-overview",
        title: "Watch the Summary",
        description:
          "The overview updates as students are marked, helping you catch missing records before leaving the page.",
        icon: Search,
      },
      {
        target: "attendance-student-cards",
        title: "Submit Each Student",
        description:
          "Pick Present or Absent for each learner. Absences require a reason before submission.",
        icon: Send,
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
        target: "students-classes-header",
        eyebrow: "Learner records",
        title: "View Students",
        description:
          "Start by selecting one of your assigned classes to see the learners connected to it.",
        icon: UsersRound,
      },
      {
        target: "students-class-grid",
        title: "Choose a Class",
        description:
          "Each class card opens a student roster with profile links, filters, and export options.",
        icon: BookOpen,
      },
      {
        target: "students-list-header",
        title: "Student Roster",
        description:
          "Once a class is selected, this area shows attendance-ready learner details and quick access to profiles.",
        icon: Search,
      },
      {
        target: "students-search-filter",
        title: "Filter the Roster",
        description:
          "Search by name, email, or admission number, then filter by active or inactive status.",
        icon: Search,
      },
      {
        target: "students-roster",
        title: "Open Student Profiles",
        description:
          "Use View profile to inspect a learner’s personal, parent, academic, and class information.",
        icon: UsersRound,
      },
    ],
  },
  {
    id: "student-profile",
    pathMatchers: ["/students/"],
    steps: [
      {
        target: "student-profile-shell",
        eyebrow: "Learner profile",
        title: "Student Profile",
        description:
          "This profile brings together the student’s identity, guardian contact, class details, and academic context.",
        icon: UsersRound,
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
