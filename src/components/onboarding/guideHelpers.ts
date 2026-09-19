/**
 * Pure helpers for the guided tour: where the highlighted element is, which
 * steps apply on this page, where to put the card, and the per-user storage
 * keys. Kept out of the component so they can be tested without a DOM tour.
 */
import type { GuideConfig } from "./guideSteps";

export type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const STORAGE_PREFIX = "talim_teacher_guide";

export function getTargetRect(target: string): TargetRect | null {
  if (typeof window === "undefined") return null;
  const element = document.querySelector<HTMLElement>(`[data-guide="${target}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function getVisibleSteps(config: GuideConfig) {
  if (typeof window === "undefined") return config.steps;
  const visibleSteps = config.steps.filter((step) =>
    document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`)
  );
  return visibleSteps.length > 0 ? visibleSteps : config.steps;
}

export function getUserId(user: { userId?: string; _id?: string; teacherId?: string } | null | undefined) {
  return user?.userId || user?._id || user?.teacherId || "guest";
}

export function getStorageKey(guideId: string, userId: string) {
  return `${STORAGE_PREFIX}:${userId}:${guideId}:completed`;
}

export function getSeenKey(guideId: string, userId: string) {
  return `${STORAGE_PREFIX}:${userId}:${guideId}:seen`;
}

export function getCardPosition(rect: TargetRect | null) {
  if (typeof window === "undefined" || !rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      arrow: "hidden",
    };
  }

  const cardWidth = Math.min(400, window.innerWidth - 32);
  const cardHeight = 330;
  const viewportPadding = 16;
  const spaceRight = window.innerWidth - (rect.left + rect.width);
  const spaceLeft = rect.left;
  const canUseSide =
    window.innerWidth >= 768 &&
    (spaceRight > cardWidth + 32 || spaceLeft > cardWidth + 32);

  if (canUseSide) {
    const placeRight = spaceRight >= cardWidth + 32;
    const top = Math.min(
      Math.max(rect.top + rect.height / 2 - cardHeight / 2, viewportPadding),
      Math.max(viewportPadding, window.innerHeight - cardHeight - viewportPadding)
    );

    return {
      top: `${top}px`,
      left: placeRight
        ? `${Math.min(
            rect.left + rect.width + 24,
            window.innerWidth - cardWidth - viewportPadding
          )}px`
        : `${Math.max(rect.left - cardWidth - 24, viewportPadding)}px`,
      transform: "none",
      arrow: placeRight ? "left" : "right",
    };
  }

  const below = rect.top + rect.height + 20;
  const fitsBelow = below + cardHeight < window.innerHeight;

  return {
    top: fitsBelow
      ? `${below}px`
      : `${Math.max(viewportPadding, rect.top - cardHeight - 20)}px`,
    left: `${Math.min(
      Math.max(rect.left + rect.width / 2 - cardWidth / 2, viewportPadding),
      window.innerWidth - cardWidth - viewportPadding
    )}px`,
    transform: "none",
    arrow: fitsBelow ? "top" : "bottom",
  };
}
