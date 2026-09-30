import { AlertCircle, CheckCircle } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/tl/styles";

/** Props for {@link EditorActionBar}. */
export interface EditorActionBarProps {
  isComplete: boolean;
  isEditing: boolean;
  isSaving: boolean;
  /** True while attachments are uploading; saving waits for them. */
  isUploading: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel?: () => void;
}

/**
 * The foot of the editor: whether the curriculum is ready, then Cancel and
 * Save.
 *
 * @param props - See {@link EditorActionBarProps}.
 * @param props.isComplete - Whether every required field is filled.
 * @param props.isEditing - Whether an existing curriculum is open.
 * @param props.isSaving - Whether a save is in flight.
 * @param props.isUploading - Whether attachments are uploading.
 * @param props.canSave - Whether the teacher may save at all.
 * @param props.onSave - Saves the curriculum.
 * @param props.onCancel - Closes the editor; the button is hidden without it.
 * @returns The action bar element.
 */
export function EditorActionBar({ isComplete, isEditing, isSaving, isUploading, canSave, onSave, onCancel }: EditorActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-tl-line-soft px-[18px] py-3.5" data-guide="curriculum-editor-actions">
      <p className={`flex min-w-[200px] flex-1 items-center gap-2 text-sm font-bold ${isComplete ? "text-tl-success" : "text-tl-warning"}`} aria-live="polite">
        {isComplete ? <CheckCircle className="h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />}
        {isUploading ? "Waiting for the attachments to upload" : isComplete ? "Ready to save" : "Needs a subject, the term and some text"}
      </p>
      <div className="flex gap-2.5">
        {onCancel ? (
          <button type="button" onClick={onCancel} className={ghostButton}>
            Cancel
          </button>
        ) : null}
        <button type="button" onClick={onSave} className={primaryButton} disabled={isSaving || isUploading || !canSave}>
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save the curriculum"}
        </button>
      </div>
    </div>
  );
}
