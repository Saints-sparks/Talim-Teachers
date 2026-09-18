"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, CheckCircle2, FileText, FolderOpen, MessageSquare, Users } from "lucide-react";
import { withAlpha, type DashboardStyles } from "./primitives";

const LINKS: Array<{ label: string; sub: string; icon: React.ElementType; href: string }> = [
  { label: "Students", sub: "Manage Students", icon: Users, href: "/students" },
  { label: "Subjects", sub: "Manage Subjects", icon: BookOpen, href: "/subjects" },
  { label: "Resources", sub: "Manage Resources", icon: FolderOpen, href: "/resources" },
  { label: "Attendance", sub: "Take Attendance", icon: CheckCircle2, href: "/attendance" },
  { label: "Grading", sub: "Grade Assessments", icon: BarChart3, href: "/grading" },
  { label: "Curriculum", sub: "Manage Curriculum", icon: FileText, href: "/curriculum" },
  { label: "Messages", sub: "Open Inbox", icon: MessageSquare, href: "/messages" },
];

/**
 * The row of shortcut tiles to every daily teaching task.
 *
 * @param props - The dashboard's theme styles.
 * @param props.styles - The dashboard's theme styles.
 * @returns The quick-links section element.
 */
export function QuickLinks({ styles }: { styles: DashboardStyles }) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border p-5" style={styles.card}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: styles.colors.text }}>
          Quick Links
        </h2>
        <span className="hidden text-xs sm:inline" style={{ color: styles.colors.textTertiary }}>
          Daily teaching tasks
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="group flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: withAlpha(styles.colors.primary, "12"), color: styles.colors.primary }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold" style={{ color: styles.colors.text }}>
                {item.label}
              </span>
              <span className="hidden text-xs sm:block" style={{ color: styles.colors.textTertiary }}>
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
