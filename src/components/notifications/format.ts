/**
 * The clock time of a timestamp, in the viewer's locale.
 *
 * @param dateString - An ISO timestamp.
 * @returns e.g. "09:30".
 */
export const formatTime = (dateString: string): string =>
  new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));

/**
 * A relative day for recent timestamps and a date for older ones.
 *
 * @param dateString - An ISO timestamp.
 * @param now - The current time; a parameter so tests can pin it.
 * @returns "Today", "Yesterday" or e.g. "04 Sep 2026".
 */
export const formatDate = (dateString: string, now: Date = new Date()): string => {
  const date = new Date(dateString);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
