/** Classes shared by the three reset steps, so they stay in step in both themes. */
export const inputClass =
  "w-full px-4 py-3 h-[50px] text-black rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#003366] focus:border-transparent dark:text-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:placeholder:text-slate-500 dark:focus:ring-blue-400";

/** Added to {@link inputClass} while the field has an error: a red border. */
export const invalidInputClass = "border-red-500 dark:border-red-500";

/** The full-width primary action under each form. */
export const submitButtonClass =
  "w-full bg-[#003366] hover:bg-[#002B5B]/90 text-white h-[50px] rounded-lg text-lg font-medium disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700";

/** A field's label. */
export const labelClass = "text-lg font-medium text-[#030E18]";

/** A field's error line, under the input. */
export const errorClass = "text-sm text-red-600 dark:text-red-400";

/** A field's lasting hint, under the input. */
export const hintClass = "text-center text-sm text-gray-600";
