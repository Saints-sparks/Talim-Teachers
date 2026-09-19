/**
 * Curriculum content is HTML written in the editor and later shown to other
 * people, so it is cleaned before it is put in the page: executable elements,
 * inline event handlers and `javascript:` addresses are removed. The editor
 * itself only produces formatting, tables, images and links, all of which
 * survive.
 */

const BLOCKED_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form", "svg", "math"];
const URL_ATTRIBUTES = ["href", "src", "xlink:href", "action", "formaction"];

/**
 * Whether a URL attribute value would run code.
 *
 * @param value - An attribute value.
 * @returns True for `javascript:`, `vbscript:` and non-image `data:` URLs.
 */
function isUnsafeUrl(value: string): boolean {
  // Browsers ignore whitespace and control characters inside the scheme.
  const compact = Array.from(value)
    .filter((char) => char.charCodeAt(0) > 32)
    .join("")
    .toLowerCase();
  return (
    compact.startsWith("javascript:") ||
    compact.startsWith("vbscript:") ||
    (compact.startsWith("data:") && !compact.startsWith("data:image/"))
  );
}

/**
 * Cleans curriculum HTML for display.
 *
 * @param html - HTML from the editor or the API.
 * @returns HTML with executable content removed. Without a DOM (server render)
 *   the input is returned as plain escaped text rather than trusted.
 */
export function sanitizeCurriculumHtml(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll(BLOCKED_TAGS.join(",")).forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      else if (URL_ATTRIBUTES.includes(name) && isUnsafeUrl(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === "A" && element.getAttribute("target") === "_blank") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  return doc.body.innerHTML;
}
