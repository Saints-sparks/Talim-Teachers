/**
 * Class strings for a curriculum's HTML (the rich-text editor's output) in
 * the redesign. Tailwind has no typography plugin here, so headings, lists,
 * tables, quotes and links are styled through arbitrary child selectors.
 * Kept under src/components so Tailwind's content scan sees them.
 */

/** Structure (sizes, spacing, lists, tables), without colours. */
const STRUCTURE =
  "break-words leading-[1.7] [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-extrabold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h3]:mt-2.5 [&_h3]:font-extrabold [&_h4]:font-bold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1.5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_th]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline";

/** Curriculum text on a redesign surface; follows the dark theme. */
export const richTextClass = `${STRUCTURE} text-sm text-tl-body [&_a]:text-tl-link [&_blockquote]:border-tl-line [&_h1]:text-tl-ink [&_h2]:text-tl-ink [&_h3]:text-tl-ink [&_td]:border-tl-line [&_th]:border-tl-line`;

/**
 * The editor's page: white with dark ink in both themes, so colours a teacher
 * picked in the toolbar read the same way students will see them.
 */
export const paperClass = `${STRUCTURE} bg-white text-[15px] text-[#0F1B2E] [&_a]:text-[#2C5FE0] [&_blockquote]:border-[#D7E1F2] [&_td]:border-[#D7E1F2] [&_th]:border-[#D7E1F2]`;
