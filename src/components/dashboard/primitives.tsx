"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

/** Which semantic colour a tile or badge draws from. */
export type StatusTone = "primary" | "success" | "warning" | "error" | "muted";

/**
 * Appends an alpha suffix to a hex colour (theme colours are all hex), for a
 * tinted background behind an icon or badge.
 *
 * @param color - A hex colour, or any CSS colour.
 * @param alpha - Two-digit hex alpha to append.
 * @returns The colour with alpha applied when it was a hex colour.
 */
export function withAlpha(color: string, alpha: string): string {
  return color.startsWith("#") ? `${color}${alpha}` : color;
}

/** The theme tokens and precomputed styles every dashboard tile shares. */
export type DashboardStyles = ReturnType<typeof useDashboardStyles>;

/**
 * Reads the active theme and derives the card/page styles the dashboard's
 * tiles share, so each one does not recompute box-shadow and background rules.
 *
 * @returns Theme colours plus ready-to-spread style objects.
 */
export function useDashboardStyles() {
  const { colors, isDark } = useTheme();

  const card: CSSProperties = {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    boxShadow: isDark ? "0 16px 40px rgba(0, 0, 0, 0.18)" : "0 16px 40px rgba(15, 23, 42, 0.04)",
  };

  return {
    colors,
    isDark,
    page: { backgroundColor: colors.bg, color: colors.text } as CSSProperties,
    card,
    primaryText: isDark ? colors.text : colors.surface,
    // Dark `colors.primary` is a light blue that reads as text on the dark surfaces,
    // so a filled primary button uses a deeper blue that keeps its light label AA.
    primaryFill: isDark ? "#2563EB" : colors.primary,
  };
}

/**
 * The colour and tinted background for one status tone.
 *
 * @param tone - Which semantic colour to use.
 * @param styles - The dashboard's theme styles.
 * @returns Inline style with `color` and `backgroundColor` set.
 */
export function toneStyles(tone: StatusTone, styles: DashboardStyles): CSSProperties {
  const color =
    tone === "success"
      ? styles.colors.success
      : tone === "warning"
        ? styles.colors.warning
        : tone === "error"
          ? styles.colors.error
          : tone === "muted"
            ? styles.colors.textTertiary
            : styles.colors.primary;

  return { color, backgroundColor: withAlpha(color, tone === "muted" ? "14" : "16") };
}

/**
 * One skeleton block, sized by its className, for the loading dashboard.
 *
 * @param props - The block's size classes and the current theme styles.
 * @param props.className - Tailwind sizing classes.
 * @param props.styles - The dashboard's theme styles.
 * @returns The skeleton element.
 */
export function SkeletonBlock({ className, styles }: { className: string; styles: DashboardStyles }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} style={{ backgroundColor: styles.colors.surfaceAlt }} />;
}

/** Props for {@link EmptyState}. */
export interface DashboardEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  styles: DashboardStyles;
}

/**
 * A tile's empty state — nothing to show yet, distinct from a failed load.
 *
 * @param props - See {@link DashboardEmptyStateProps}.
 * @param props.icon - The tile's icon.
 * @param props.title - Short heading.
 * @param props.description - One line of explanation.
 * @param props.action - Optional call to action.
 * @param props.styles - The dashboard's theme styles.
 * @returns The empty-state element.
 */
export function EmptyState({ icon, title, description, action, styles }: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
      <div
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: withAlpha(styles.colors.primary, "12"), color: styles.colors.primary }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold" style={{ color: styles.colors.text }}>
        {title}
      </p>
      <p className="mt-1 max-w-xs text-xs" style={{ color: styles.colors.textTertiary }}>
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * One primary or secondary quick-action button in the dashboard's hero.
 *
 * @param props - Icon, label, destination and emphasis.
 * @param props.icon - Leading icon.
 * @param props.label - Button label.
 * @param props.href - Destination route.
 * @param props.primary - Draws the filled (vs outlined) variant.
 * @param props.styles - The dashboard's theme styles.
 * @returns The link-button element.
 */
export function HeroAction({
  icon,
  label,
  href,
  primary = false,
  styles,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  primary?: boolean;
  styles: DashboardStyles;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: primary ? styles.primaryFill : styles.colors.surface,
        borderColor: primary ? styles.primaryFill : styles.colors.border,
        color: primary ? styles.primaryText : styles.colors.primary,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * One KPI tile: an icon, a big number and a link to the page it summarises.
 *
 * @param props - The tile's content.
 * @param props.icon - Leading icon.
 * @param props.label - What is being counted.
 * @param props.value - The count.
 * @param props.subtext - One line of context.
 * @param props.href - The page this KPI links to.
 * @param props.tone - Which semantic colour the icon uses.
 * @param props.styles - The dashboard's theme styles.
 * @returns The tile element.
 */
export function KpiCard({
  icon,
  label,
  value,
  subtext,
  href,
  tone = "primary",
  styles,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  href: string;
  tone?: StatusTone;
  styles: DashboardStyles;
}) {
  return (
    <Link href={href} className="group rounded-2xl border p-4 transition-transform hover:-translate-y-0.5" style={styles.card}>
      <div className="mb-5 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={toneStyles(tone, styles)}>
          {icon}
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: styles.colors.text }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold leading-tight" style={{ color: styles.colors.text }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: styles.colors.textTertiary }}>
        {subtext}
      </p>
      <span
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold group-hover:underline"
        style={{ color: styles.colors.primary }}
      >
        View all <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/**
 * The bordered panel every dashboard section sits in, with a title bar.
 *
 * @param props - Title, optional action and the section's content.
 * @param props.title - The section name.
 * @param props.action - Rendered at the end of the title bar.
 * @param props.children - The section's content.
 * @param props.styles - The dashboard's theme styles.
 * @returns The section element.
 */
export function SectionCard({
  title,
  action,
  children,
  styles,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  styles: DashboardStyles;
}) {
  return (
    <section className="rounded-2xl border p-4" style={styles.card}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold" style={{ color: styles.colors.text }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A small "label — link" pairing used as a section's title-bar action.
 *
 * @param props - Destination and label.
 * @param props.href - Destination route.
 * @param props.label - Link text.
 * @param props.styles - The dashboard's theme styles.
 * @returns The link element.
 */
export function TextAction({ href, label, styles }: { href: string; label: string; styles: DashboardStyles }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: styles.colors.primary }}>
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/**
 * One counter row inside a section card: a coloured dot, a label and a value.
 *
 * @param props - The row's content.
 * @param props.label - What is being counted.
 * @param props.value - The count.
 * @param props.tone - Which semantic colour the dot and value use.
 * @param props.styles - The dashboard's theme styles.
 * @returns The row element.
 */
export function CounterRow({
  label,
  value,
  tone,
  styles,
}: {
  label: string;
  value: string | number;
  tone: StatusTone;
  styles: DashboardStyles;
}) {
  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: styles.colors.borderLight }}>
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: toneStyles(tone, styles).color }} />
      <span className="flex-1 text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
        {label}
      </span>
      <span className="text-sm font-bold" style={{ color: toneStyles(tone, styles).color }}>
        {value}
      </span>
    </div>
  );
}
