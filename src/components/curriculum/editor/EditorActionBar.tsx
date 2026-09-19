import { AlertCircle, CheckCircle, Save } from "lucide-react";

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
 * The footer of the editor: whether the curriculum is ready, and Cancel / Save.
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
    <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center" data-guide="curriculum-editor-actions">
      <div className="flex items-center gap-2">
        {isComplete ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Ready to save</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Complete all required fields</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-[#F0F0F0] text-[#6F6F6F] rounded-lg hover:bg-[#F8F8F8] transition-colors font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-2 bg-[#003366] text-white px-8 py-3 rounded-lg hover:bg-[#002244] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-none"
          disabled={isSaving || isUploading || !canSave}
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving..." : isEditing ? "Update Curriculum" : "Save Curriculum"}
        </button>
      </div>
    </div>
  );
}
