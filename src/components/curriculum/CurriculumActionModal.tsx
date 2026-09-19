"use client";
import React from "react";
import { Dialog } from "@headlessui/react";
import type { Curriculum } from "@/hooks/curriculum/types";

/** Props for {@link CurriculumActionModal}. */
interface CurriculumActionModalProps {
  open: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  /** Accepted for the subject cards' call site; the actions do not depend on it. */
  curriculum?: Curriculum | null;
}

/**
 * The "what would you like to do?" choice the subject cards show for a course
 * that already has a curriculum: view it or edit it. The headless dialog locks
 * page scroll and closes on Escape.
 *
 * @param props - See {@link CurriculumActionModalProps}.
 * @param props.open - Whether the dialog is showing.
 * @param props.onClose - Closes the dialog.
 * @param props.onView - Opens the curriculum for reading.
 * @param props.onEdit - Opens the curriculum in the editor.
 * @returns The dialog element.
 */
const CurriculumActionModal: React.FC<CurriculumActionModalProps> = ({ open, onClose, onView, onEdit }) => {
  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <Dialog.Panel className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-auto z-10">
        <Dialog.Title className="text-lg font-semibold mb-2">What would you like to do?</Dialog.Title>
        <Dialog.Description className="mb-4 text-gray-600">Choose an action for this curriculum.</Dialog.Description>
        <div className="flex flex-col gap-3">
          <button
            className="w-full py-2 px-4 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            onClick={() => { onView(); onClose(); }}
          >
            View Curriculum
          </button>
          <button
            className="w-full py-2 px-4 rounded bg-green-600 text-white font-medium hover:bg-green-700 transition"
            onClick={() => { onEdit(); onClose(); }}
          >
            Edit Curriculum
          </button>
        </div>
        <button
          className="mt-6 w-full py-2 px-4 rounded bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
          onClick={onClose}
        >
          Cancel
        </button>
      </Dialog.Panel>
    </Dialog>
  );
};

export default CurriculumActionModal;
