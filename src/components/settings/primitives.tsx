"use client";

import React from "react";

/** Props for {@link SectionHeader}. */
export interface SectionHeaderProps {
  title: string;
  desc: string;
}

/**
 * The heading every settings section opens with.
 *
 * @param props - Title and one-line description.
 * @param props.title - The section name.
 * @param props.desc - What the section controls.
 * @returns The heading element.
 */
export function SectionHeader({ title, desc }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{desc}</p>
    </div>
  );
}

/**
 * The bordered panel every settings group sits in.
 *
 * @param props - Children and extra classes.
 * @param props.children - The panel contents.
 * @param props.className - Extra classes for the panel.
 * @returns The panel element.
 */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      {children}
    </div>
  );
}

/**
 * A card's title bar, optionally with an action on the right.
 *
 * @param props - Title and optional action.
 * @param props.title - The group name.
 * @param props.action - Rendered at the end of the bar.
 * @returns The header element.
 */
export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 dark:border-slate-700 sm:px-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</h3>
      {action}
    </div>
  );
}

/** Props for {@link ToggleRow}. */
export interface ToggleRowProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * One labelled on/off switch.
 *
 * @param props - See {@link ToggleRowProps}.
 * @param props.label - What the switch controls.
 * @param props.desc - One line of explanation.
 * @param props.checked - Whether it is on.
 * @param props.onChange - Called with the new value.
 * @param props.disabled - Disables the switch while a save is in flight.
 * @returns The row element.
 */
export function ToggleRow({ label, desc, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-3 last:border-0 dark:border-slate-700">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] disabled:opacity-50 dark:focus-visible:ring-blue-500 ${
          checked ? "bg-[#003366] dark:bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * A read-only label/value pair.
 *
 * @param props - Label and value.
 * @param props.label - What the value is.
 * @param props.value - The value itself.
 * @returns The row element.
 */
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <div className="break-words text-sm font-medium text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

/** Props for {@link ActionCard}. */
export interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  action: React.ReactNode;
}

/**
 * An icon, a short explanation and one call to action.
 *
 * @param props - See {@link ActionCardProps}.
 * @param props.icon - The tile's icon.
 * @param props.iconBg - Background classes for the icon tile.
 * @param props.iconColor - Colour classes for the icon.
 * @param props.title - What the action does.
 * @param props.desc - One line of explanation.
 * @param props.action - The link or button.
 * @returns The card element.
 */
export function ActionCard({ icon, iconBg, iconColor, title, desc, action }: ActionCardProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{desc}</p>
      </div>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

/** Props for {@link SummaryCard}. */
export interface SummaryCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * One number from the account summary.
 *
 * @param props - See {@link SummaryCardProps}.
 * @param props.label - What is being counted.
 * @param props.value - The count.
 * @param props.sub - One line of context.
 * @param props.icon - The tile's icon.
 * @param props.color - Colour classes for the icon and value.
 * @returns The card element.
 */
export function SummaryCard({ label, value, sub, icon, color }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

/** Props for {@link SelectRow}. */
export interface SelectRowProps<T extends string> {
  label: string;
  desc?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * One labelled dropdown preference.
 *
 * @typeParam T - The union of allowed values.
 * @param props - See {@link SelectRowProps}.
 * @param props.label - What the dropdown controls.
 * @param props.desc - One line of explanation.
 * @param props.value - The current value.
 * @param props.options - Every value the DTO allows.
 * @param props.onChange - Called with the chosen value.
 * @param props.disabled - Disables the control while a save is in flight.
 * @returns The row element.
 */
export function SelectRow<T extends string>({ label, desc, value, options, onChange, disabled }: SelectRowProps<T>) {
  const id = `setting-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-3 border-b border-gray-50 py-3 last:border-0 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-gray-800 dark:text-slate-200">
          {label}
        </label>
        {desc && <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{desc}</p>}
      </div>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003366] disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:ring-blue-500 sm:w-auto sm:min-w-[180px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A row of placeholder bars, so a settings section does not jump when its
 * values arrive.
 *
 * @param props - How many rows to draw.
 * @param props.rows - Placeholder row count.
 * @returns The skeleton element.
 */
export function SettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading settings" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}
