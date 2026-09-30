"use client";

import React, { useId, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { card, focusRing, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";

/** The row's padding and spacing (the design's `baseRow.rowStyle`). */
const rowLayout = "flex w-full min-h-[44px] items-center gap-4 py-[15px] text-left";

/** The row label (15px, 700). */
const rowLabel = "block text-[15px] font-bold text-tl-ink";

/** The row description (13px, muted). */
const rowDescription = "mt-[3px] block text-[13px] text-tl-muted";

/** The uppercase group heading (the design's `g.h`). */
export const groupHeading = "mb-1 text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint";

/** Props for {@link SettingsGroup}. */
export interface SettingsGroupProps {
  /** The uppercase heading ("Categories", "Delivery"). */
  heading: string;
  children: ReactNode;
}

/**
 * A group of rows under an uppercase heading, each row separated by a soft
 * line (the design's `setGroups`).
 *
 * @param props - See {@link SettingsGroupProps}.
 * @param props.heading - The group's heading.
 * @param props.children - The rows.
 * @returns The labelled section.
 */
export function SettingsGroup({ heading, children }: SettingsGroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-[22px]">
      <h3 id={headingId} className={groupHeading}>
        {heading}
      </h3>
      <div className="flex flex-col [&>*]:border-t [&>*]:border-tl-line-soft">{children}</div>
    </section>
  );
}

/** Props for {@link ToggleRow}. */
export interface ToggleRowProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  /** Called with the new value when the row is pressed. */
  onChange: (next: boolean) => void;
  /** True while this switch is saving. */
  disabled?: boolean;
  /** Content under the row (the quiet hours times). */
  children?: ReactNode;
  /** A `data-guide` target. */
  guide?: string;
}

/**
 * A whole-row switch (the design's `toggleRow`): one `role="switch"` button,
 * named by its label and described by its description, with the 46×28 track.
 *
 * @param props - See {@link ToggleRowProps}.
 * @param props.label - The switch's name.
 * @param props.description - The line under it.
 * @param props.checked - Whether it is on.
 * @param props.onChange - Receives the new value.
 * @param props.disabled - Disables it while it saves.
 * @param props.children - Extra content under the row.
 * @param props.guide - A `data-guide` target.
 * @returns The row.
 */
export function ToggleRow({ label, description, checked, onChange, disabled = false, children, guide }: ToggleRowProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-guide={guide}
        className={`${rowLayout} cursor-pointer rounded-xl disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
      >
        <span className="min-w-0 flex-1">
          <span id={labelId} className={rowLabel}>
            {label}
          </span>
          {description ? (
            <span id={descriptionId} className={rowDescription}>
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors ${checked ? "bg-tl-brand-fill" : "bg-tl-control"}`}
        >
          <span
            className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,27,46,0.25)] transition-[left] ${checked ? "left-[21px]" : "left-[3px]"}`}
          />
        </span>
      </button>
      {children}
    </div>
  );
}

/** Props for {@link LinkRow}. */
export interface LinkRowProps {
  label: string;
  description?: ReactNode;
  /** A button row: what pressing it does. */
  onClick?: () => void;
  /** A link row: where it goes. */
  href?: string;
  /** Opens `href` in a new tab (legal pages). */
  external?: boolean;
  disabled?: boolean;
  guide?: string;
}

/**
 * A row that opens something, with a chevron (the design's `linkRow`): a
 * button, or a link when it has an `href`.
 *
 * @param props - See {@link LinkRowProps}.
 * @param props.label - The row's name.
 * @param props.description - The line under it.
 * @param props.onClick - The action of a button row.
 * @param props.href - The target of a link row.
 * @param props.external - Opens the link in a new tab.
 * @param props.disabled - Disables a button row.
 * @param props.guide - A `data-guide` target.
 * @returns The row.
 */
export function LinkRow({ label, description, onClick, href, external = false, disabled = false, guide }: LinkRowProps) {
  const labelId = useId();
  const descriptionId = useId();
  const externalId = useId();
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span id={labelId} className={rowLabel}>
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className={rowDescription}>
            {description}
          </span>
        ) : null}
      </span>
      {external ? (
        <span id={externalId} className="sr-only">
          (opens in a new tab)
        </span>
      ) : null}
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-tl-faint" />
    </>
  );
  const a11y = {
    "aria-labelledby": external ? `${labelId} ${externalId}` : labelId,
    "aria-describedby": description ? descriptionId : undefined,
    "data-guide": guide,
  };
  const className = `${rowLayout} rounded-xl hover:bg-tl-bg/60 ${focusRing}`;
  if (href) {
    return (
      <div>
        <a href={href} className={className} {...a11y} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {content}
        </a>
      </div>
    );
  }
  return (
    <div>
      <button type="button" onClick={onClick} disabled={disabled} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`} {...a11y}>
        {content}
      </button>
    </div>
  );
}

/** Props for {@link ValueRow}. */
export interface ValueRowProps {
  label: string;
  description?: ReactNode;
  /** The right-aligned value. */
  value: ReactNode;
  /** Replaces the value with a control (a pill and a button on a session row). */
  action?: ReactNode;
}

/**
 * A row with a right-aligned value (the design's `valueRow`).
 *
 * @param props - See {@link ValueRowProps}.
 * @param props.label - The row's name.
 * @param props.description - The line under it.
 * @param props.value - The value shown on the right.
 * @param props.action - Controls shown after the value.
 * @returns The row.
 */
export function ValueRow({ label, description, value, action }: ValueRowProps) {
  return (
    <div className={rowLayout}>
      <div className="min-w-0 flex-1">
        <div className={rowLabel}>{label}</div>
        {description ? <div className={`${rowDescription} break-words`}>{description}</div> : null}
      </div>
      {value !== null && value !== undefined && value !== "" ? (
        <div className="shrink-0 text-right text-sm font-bold text-tl-muted">{value}</div>
      ) : null}
      {action}
    </div>
  );
}

/** One option of a {@link ChoiceRow}. */
export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** Props for {@link ChoiceRow}. */
export interface ChoiceRowProps<T extends string> {
  label: string;
  description?: string;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * A row with a labelled native select (the design's `choiceRow`).
 *
 * @param props - See {@link ChoiceRowProps}.
 * @param props.label - The select's label.
 * @param props.description - The line under it (the select's description).
 * @param props.value - The chosen value.
 * @param props.options - The choices.
 * @param props.onChange - Receives the new value.
 * @param props.disabled - Disables the select while it saves.
 * @returns The row.
 */
export function ChoiceRow<T extends string>({ label, description, value, options, onChange, disabled = false }: ChoiceRowProps<T>) {
  const selectId = useId();
  const descriptionId = useId();
  return (
    <div className={`${rowLayout} flex-wrap sm:flex-nowrap`}>
      <div className="min-w-[180px] flex-1">
        <label htmlFor={selectId} className={rowLabel}>
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className={rowDescription}>
            {description}
          </span>
        ) : null}
      </div>
      <div className="relative shrink-0">
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
          onChange={(event) => onChange(event.target.value as T)}
          className={`min-h-[44px] min-w-[170px] cursor-pointer appearance-none rounded-xl border border-tl-control bg-tl-surface py-0 pl-3.5 pr-10 text-sm font-bold text-tl-ink disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tl-muted" />
      </div>
    </div>
  );
}

/**
 * Grey rows while a panel's data loads.
 *
 * @param props - What is loading.
 * @param props.label - The status's accessible name ("Loading your account").
 * @param props.rows - How many placeholder rows.
 * @returns The skeleton.
 */
export function PanelSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="mt-5 flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[58px] animate-pulse rounded-2xl bg-tl-line/70" />
      ))}
    </div>
  );
}

/**
 * A panel's (or a group's) load error with a retry.
 *
 * @param props - The failure.
 * @param props.error - What the request threw.
 * @param props.fallback - The message when the error carries none.
 * @param props.onRetry - Refetches.
 * @returns The alert.
 */
export function PanelError({ error, fallback, onRetry }: { error: unknown; fallback: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-5 rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
      <p className="text-sm font-bold text-tl-ink">{fallback}</p>
      <p className="mt-1 text-[13px] text-tl-muted">{getErrorMessage(error, "Check your connection and try again.")}</p>
      <button type="button" className={`${primaryButton} mt-3`} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/** The panel card's class string (the design's right-hand card). */
export const panelCard = `${card} min-w-0`;
