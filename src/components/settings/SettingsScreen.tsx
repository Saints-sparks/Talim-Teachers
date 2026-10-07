"use client";

import React, { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { focusRing, pagePad, pageTitle } from "@/components/tl/styles";
import { SETTINGS_TABS, settingsHref, settingsTab, type SettingsTabId } from "@/hooks/settings/settings.logic";
import { AboutPanel } from "./AboutPanel";
import { AccountPanel } from "./AccountPanel";
import { AppearancePanel } from "./AppearancePanel";
import { HelpPanel } from "./HelpPanel";
import { MessagesPanel } from "./MessagesPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { SecurityPanel } from "./SecurityPanel";
import { panelCard } from "./SettingsRows";
import { TeachingPanel } from "./TeachingPanel";

/** What a panel may be given: only Help uses it (the ticket to open). */
interface SettingsPanelProps {
  ticketId?: string | null;
}

/** The content of each tab's panel. */
const PANELS: Readonly<Record<SettingsTabId, ComponentType<SettingsPanelProps>>> = {
  account: AccountPanel,
  notifications: NotificationsPanel,
  messages: MessagesPanel,
  teaching: TeachingPanel,
  appearance: AppearancePanel,
  security: SecurityPanel,
  help: HelpPanel,
  about: AboutPanel,
};

/** Props for {@link SettingsScreen}. */
export interface SettingsScreenProps {
  /** The tab `?tab=` names (already parsed, aliases followed). */
  initialTab?: SettingsTabId;
  /** The ticket `?ticket=` names, opened on the Help tab (a support notification's link). */
  ticketId?: string | null;
}

/**
 * The redesigned Settings: a rail of eight tabs and the chosen tab's panel
 * (the design's Settings screen, markup ~1067–1250). Picking a tab updates
 * `?tab=` without scrolling, so a tab can be linked to and survives a reload.
 *
 * Guide targets: `settings-tabs` on the rail, `settings-tab-<id>` on each tab.
 *
 * @param props - See {@link SettingsScreenProps}.
 * @param props.initialTab - The tab to open.
 * @param props.ticketId - The support ticket to open on the Help tab.
 * @returns The screen.
 */
export function SettingsScreen({ initialTab = "account", ticketId = null }: SettingsScreenProps) {
  const router = useRouter();
  const [active, setActive] = useState<SettingsTabId>(initialTab);

  // Follow the URL (back and forward, a link to another tab).
  useEffect(() => setActive(initialTab), [initialTab]);

  /**
   * Opens a tab and records it in the URL.
   *
   * @param id - The tab.
   */
  const pick = (id: SettingsTabId) => {
    setActive(id);
    const target = settingsHref(id);
    if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target, { scroll: false });
  };

  const tab = settingsTab(active);
  const Panel = PANELS[active];
  return (
    <div className={pagePad}>
      <div className="flex flex-col gap-[18px]">
        <header>
          <h1 className={pageTitle}>Settings</h1>
          <p className="mt-[5px] text-[15px] text-tl-muted">Your account, alerts and workspace defaults.</p>
        </header>
        <div className="grid items-start gap-[18px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav
            aria-label="Settings sections"
            data-guide="settings-tabs"
            className="grid grid-cols-1 gap-0.5 rounded-[22px] border border-tl-line bg-tl-surface p-2 shadow-[0_1px_2px_rgba(15,27,46,0.04)] min-[520px]:grid-cols-2 lg:grid-cols-1"
          >
            {SETTINGS_TABS.map((item) => {
              const on = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  aria-controls="settings-panel"
                  aria-labelledby={`settings-tab-${item.id}-label`}
                  aria-describedby={`settings-tab-${item.id}-description`}
                  data-guide={`settings-tab-${item.id}`}
                  onClick={() => pick(item.id)}
                  className={`min-h-[44px] rounded-[14px] px-3.5 py-3 text-left transition-colors ${focusRing} ${
                    on ? "bg-tl-select text-tl-brand" : "text-tl-ink hover:bg-tl-bg"
                  }`}
                >
                  <span id={`settings-tab-${item.id}-label`} className="block text-[15px] font-extrabold">
                    {item.label}
                  </span>
                  <span id={`settings-tab-${item.id}-description`} className="mt-0.5 block text-[13px] text-tl-muted">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </nav>
          <section id="settings-panel" aria-labelledby="settings-panel-title" className={panelCard}>
            <h2 id="settings-panel-title" className="text-xl font-extrabold tracking-[-0.3px] text-tl-ink">
              {tab.title}
            </h2>
            <p className="mt-1 text-sm text-tl-muted">{tab.body}</p>
            <Panel key={active} {...(active === "help" ? { ticketId } : {})} />
          </section>
        </div>
      </div>
    </div>
  );
}
