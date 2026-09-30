"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/auth/AuthCard";
import { eyebrow, ghostButton, pageTitle } from "@/components/tl/styles";

/** Props for {@link OnboardingFrame}. */
export interface OnboardingFrameProps {
  /** "Step 1 of 2" and the like, above the heading. */
  stepText: string;
  title: string;
  /** One or two lines under the heading. */
  description: ReactNode;
  /** Offer "Go to Today" in the top bar (the checklist can be finished later). */
  showToday?: boolean;
  /** Right of the heading (the progress figure). */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * The first-run pages' frame in the redesign: a slim top bar with the Talim
 * mark (and "Go to Today" once the profile is confirmed), then a page of at
 * most 960px on the grey background with an eyebrow, the heading and a line
 * under it. There is no sidebar: onboarding comes before the portal.
 *
 * @param props - See {@link OnboardingFrameProps}.
 * @param props.stepText - The eyebrow.
 * @param props.title - The heading.
 * @param props.description - The line under it.
 * @param props.showToday - Whether "Go to Today" shows.
 * @param props.aside - Content right of the heading.
 * @param props.children - The page.
 * @returns The framed page.
 */
export function OnboardingFrame({ stepText, title, description, showToday = false, aside, children }: OnboardingFrameProps) {
  return (
    <div className="min-h-dvh bg-tl-bg font-manrope text-tl-ink">
      <header className="border-b border-tl-line bg-tl-surface px-[clamp(14px,3vw,26px)] py-3">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3">
          <BrandMark />
          {showToday ? (
            <Link href="/dashboard" className={ghostButton} title="You can finish these steps later from Today">
              Go to Today
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[960px] flex-col gap-[18px] px-[clamp(14px,3vw,26px)] pb-16 pt-[clamp(18px,3vw,28px)]">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="min-w-0">
            <p className={eyebrow}>{stepText}</p>
            <h1 className={`${pageTitle} mt-1`}>{title}</h1>
            <div className="mt-[5px] max-w-[680px] text-[15px] text-tl-muted">{description}</div>
          </div>
          {aside}
        </div>
        {children}
      </main>
    </div>
  );
}
