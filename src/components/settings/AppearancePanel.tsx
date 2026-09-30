"use client";

import React, { type KeyboardEvent } from "react";
import { toast } from "@/components/CustomToast";
import { focusRing } from "@/components/tl/styles";
import { useTheme, type Theme } from "@/providers/theme-provider";
import { usePreferenceSaver } from "@/hooks/settings/usePreferenceSaver";

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string; description: string }> = [
  { value: "light", label: "Light", description: "Always use light mode" },
  { value: "dark", label: "Dark", description: "Always use dark mode" },
  { value: "system", label: "System", description: "Follow device setting" },
];

/**
 * Settings → Appearance: Light, Dark or System (the default). The theme is
 * applied on this device at once and saved to the account so it follows the
 * teacher. The cards are a radio group (arrow keys move the choice).
 *
 * @returns The panel content.
 */
export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const { save } = usePreferenceSaver();

  /**
   * Applies and saves a theme.
   *
   * @param value - The theme picked.
   */
  const pick = (value: Theme) => {
    if (value === theme) return;
    setTheme(value);
    save("theme", { theme: value });
    const label = THEME_OPTIONS.find((option) => option.value === value)?.label ?? value;
    toast.success(`${label} theme selected.`);
  };

  /**
   * Arrow keys move the selection, as in a native radio group.
   *
   * @param event - The key press on a card.
   * @param index - The card's position.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = THEME_OPTIONS[(index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length];
    pick(next.value);
    const group = event.currentTarget.parentElement;
    group?.querySelector<HTMLButtonElement>(`[data-theme-option="${next.value}"]`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Theme" className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
      {THEME_OPTIONS.map((option, index) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-theme-option={option.value}
            onClick={() => pick(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`min-h-[44px] rounded-2xl border-2 p-[18px] text-left transition-colors ${focusRing} ${
              selected ? "border-tl-brand-fill bg-tl-select" : "border-tl-line-soft bg-tl-surface hover:border-tl-control"
            }`}
          >
            <span className="block text-base font-extrabold text-tl-ink">{option.label}</span>
            <span className="mt-1 block text-[13px] text-tl-muted">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
