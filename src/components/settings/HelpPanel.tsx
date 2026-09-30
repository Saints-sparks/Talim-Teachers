"use client";

import React, { useState } from "react";
import { TOUR_STEPS, useTour } from "@/components/tour/TourProvider";
import { useAuth } from "@/app/context/AuthContext";
import { usePreferenceSaver } from "@/hooks/settings/usePreferenceSaver";
import { gettingStartedDescription } from "@/hooks/settings/settings.logic";
import { ContactOfficeSheet } from "./ContactOfficeSheet";
import { ReportProblemSheet } from "./ReportProblemSheet";
import { LinkRow, SettingsGroup, ToggleRow } from "./SettingsRows";

/**
 * Settings → Help: the portal tour, the page guides switch, the school
 * office's contact sheet and the problem report for Talim support.
 *
 * @returns The panel content.
 */
export function HelpPanel() {
  const tour = useTour();
  const { user } = useAuth();
  const { preferences, save, savingKey } = usePreferenceSaver();
  const [sheet, setSheet] = useState<"contact" | "report" | null>(null);

  /**
   * Opens or closes one of the sheets.
   *
   * @param which - The sheet.
   * @returns The `onOpenChange` handler for it.
   */
  const toggleSheet = (which: "contact" | "report") => (open: boolean) => setSheet(open ? which : null);

  return (
    <>
      <SettingsGroup heading="Support">
        {tour ? <LinkRow label="Getting started" description={gettingStartedDescription(TOUR_STEPS.length)} onClick={tour.openTour} /> : null}
        <ToggleRow
          label="Show page guides"
          description="A short guide on each page the first time you open it"
          checked={preferences.guides.showAppTips}
          disabled={savingKey === "guides.showAppTips"}
          onChange={(value) => save("guides.showAppTips", { guides: { ...preferences.guides, showAppTips: value } })}
        />
        <LinkRow label="Contact the school office" description="Call, email or visit" onClick={() => setSheet("contact")} />
        <LinkRow label="Report a problem" description="Goes straight to the Talim support team" onClick={() => setSheet("report")} />
      </SettingsGroup>
      <ContactOfficeSheet open={sheet === "contact"} onOpenChange={toggleSheet("contact")} fallbackSchoolName={user?.schoolName} />
      <ReportProblemSheet open={sheet === "report"} onOpenChange={toggleSheet("report")} email={user?.email} />
    </>
  );
}
