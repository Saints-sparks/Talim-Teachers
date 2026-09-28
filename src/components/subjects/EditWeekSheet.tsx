"use client";

import React, { useEffect, useId, useState } from "react";
import { toast } from "@/components/CustomToast";
import { Sheet } from "@/components/tl/Sheet";
import { fieldControl, fieldLabel, ghostButton, primaryButton } from "@/components/tl/styles";
import { subjectLabel } from "@/hooks/subjects/scheme.logic";
import { useSaveWeek } from "@/hooks/subjects/useSubjects";
import { getErrorMessage } from "@/lib/apiError";
import type { SchemeWeek, SubjectCard } from "@/types/subjects";

/** Props for {@link EditWeekSheet}. */
export interface EditWeekSheetProps {
  card: SubjectCard;
  /** The week being edited; null when closed. */
  week: SchemeWeek | null;
  onClose: () => void;
  /** The page's term param (undefined for the current term), for the cache. */
  termParam: string | undefined;
  /** The scheme's term id, sent with the save. */
  termId: string | undefined;
}

/**
 * The design's "week" sheet: a week's topic and objectives, saved with
 * `PUT /scheme-of-work/course/:courseId/weeks/:week`. As in the design, an
 * empty topic keeps the one already there.
 *
 * @param props - See {@link EditWeekSheetProps}.
 * @returns The sheet.
 */
export function EditWeekSheet({ card, week, onClose, termParam, termId }: EditWeekSheetProps) {
  const save = useSaveWeek();
  const [topic, setTopic] = useState("");
  const [objectives, setObjectives] = useState("");
  const topicId = useId();
  const objectivesId = useId();

  useEffect(() => {
    if (!week) return;
    setTopic(week.topic);
    setObjectives(week.objectives);
  }, [week]);

  const submit = async () => {
    if (!week) return;
    try {
      await save.mutateAsync({
        courseId: card.course.id,
        week: week.week,
        topic: topic.trim() || week.topic,
        objectives: objectives.trim(),
        termParam,
        termId,
      });
      toast.success(`Week ${week.week} saved.`);
      onClose();
    } catch (caught) {
      toast.error(getErrorMessage(caught, `Week ${week.week} was not saved. Please try again.`));
    }
  };

  return (
    <Sheet
      open={Boolean(week)}
      onOpenChange={(next) => !next && !save.isPending && onClose()}
      eyebrowText={subjectLabel(card)}
      title={week ? `Week ${week.week}` : ""}
      footer={
        <>
          <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={onClose} disabled={save.isPending}>
            Cancel
          </button>
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save week"}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={topicId} className={fieldLabel}>
            Topic
          </label>
          <input id={topicId} type="text" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic" className={fieldControl} maxLength={200} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={objectivesId} className={fieldLabel}>
            Objectives
          </label>
          <textarea
            id={objectivesId}
            value={objectives}
            onChange={(event) => setObjectives(event.target.value)}
            placeholder="What students should be able to do by the end of the week"
            rows={5}
            className={`${fieldControl} min-h-[120px] py-3 leading-[1.55]`}
          />
        </div>
      </form>
    </Sheet>
  );
}
