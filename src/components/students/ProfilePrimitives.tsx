import React from "react";
import { Users } from "lucide-react";

/** The tabs of the student profile. */
export type ProfileTab = "personal" | "parent" | "academic";

/**
 * A value for display, with a fallback for blanks.
 *
 * @param value - Any value; `null`, `undefined` and "" count as blank.
 * @param fallback - Shown for a blank value.
 * @returns The text to render.
 */
export const safe = (value: unknown, fallback = "N/A"): string =>
  value === null || value === undefined || value === "" ? fallback : String(value);

/**
 * A date of birth as text: a long local date when the value parses, otherwise
 * the raw value, otherwise "N/A".
 *
 * @param value - ISO date string from the server.
 * @returns The text to render.
 */
export function formatBirthDate(value: string | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * One labelled value with an icon, the profile's basic row.
 *
 * @param props - Component props.
 * @param props.icon - Icon component.
 * @param props.label - Small caps label.
 * @param props.value - The text to show.
 * @returns The row.
 */
export const FieldCard = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 dark:bg-[#111C31] dark:border-[#263A5C]">
    <div className="w-9 h-9 rounded-lg bg-[#003366]/10 border border-[#003366]/15 flex items-center justify-center flex-shrink-0 dark:bg-[#0E2A4A] dark:border-[#315F95]">
      <Icon className="w-4 h-4 text-[#003366] dark:text-blue-200" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider dark:text-slate-300">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5 break-words dark:text-slate-100">{value}</p>
    </div>
  </div>
);

/**
 * The placeholder for a tab with nothing to show.
 *
 * @param props - Component props.
 * @param props.message - What is missing.
 * @returns The empty section.
 */
export const EmptySection = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 py-12">
    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center dark:bg-slate-800">
      <Users className="w-7 h-7 text-gray-300 dark:text-slate-500" />
    </div>
    <p className="text-sm text-gray-500 text-center max-w-xs dark:text-slate-400">{message}</p>
  </div>
);

/**
 * A tab button.
 *
 * @param props - Component props.
 * @param props.active - Whether it is the selected tab.
 * @param props.icon - Icon component.
 * @param props.label - Full label; phones show its first word.
 * @param props.onClick - Selects the tab.
 * @returns The button.
 */
export const TabPill = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
      active
        ? "bg-[#003366] text-white shadow-sm"
        : "bg-white text-gray-500 border border-gray-200 hover:text-[#003366] hover:border-[#003366]/30 dark:bg-[#0F172A] dark:text-slate-300 dark:border-[#263A5C] dark:hover:text-blue-200"
    }`}
  >
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-md ${
        active ? "bg-white/20" : "bg-gray-100 dark:bg-[#1B2B45]"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-500 dark:text-slate-300"}`} />
    </span>
    <span className="hidden sm:inline">{label}</span>
    <span className="sm:hidden text-xs">{label.split(" ")[0]}</span>
  </button>
);
