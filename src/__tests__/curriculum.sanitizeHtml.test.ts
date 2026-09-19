/**
 * @jest-environment jsdom
 */
import { sanitizeCurriculumHtml } from "@/components/curriculum/sanitizeHtml";

describe("sanitizeCurriculumHtml", () => {
  it("keeps what the editor produces", () => {
    const html = '<h2>Week 1</h2><p><strong>Bold</strong> <a href="https://x.test">link</a></p><table><tr><td>1</td></tr></table>';
    const out = sanitizeCurriculumHtml(html);
    expect(out).toContain("<h2>Week 1</h2>");
    expect(out).toContain('href="https://x.test"');
    expect(out).toContain("<table>");
  });

  it("removes scripts, iframes and styles", () => {
    const out = sanitizeCurriculumHtml('<p>hi</p><script>alert(1)</script><iframe src="https://evil.test"></iframe><style>p{}</style>');
    expect(out).toBe("<p>hi</p>");
  });

  it("removes inline event handlers", () => {
    const out = sanitizeCurriculumHtml('<img src="https://x.test/a.png" onerror="alert(1)"><p onclick="x()">t</p>');
    expect(out).not.toMatch(/onerror|onclick/i);
    expect(out).toContain("https://x.test/a.png");
  });

  it("removes javascript: addresses, even with hidden whitespace", () => {
    const out = sanitizeCurriculumHtml('<a href="jav&#x09;ascript:alert(1)">a</a><a href=" JavaScript:alert(1)">b</a>');
    expect(out).not.toMatch(/javascript/i);
  });

  it("keeps inline images but drops other data: URLs", () => {
    const out = sanitizeCurriculumHtml('<img src="data:image/png;base64,AAAA"><a href="data:text/html,<b>x</b>">x</a>');
    expect(out).toContain("data:image/png");
    expect(out).not.toContain("data:text/html");
  });

  it("marks links that open a new tab as noopener", () => {
    expect(sanitizeCurriculumHtml('<a href="https://x.test" target="_blank">x</a>')).toContain('rel="noopener noreferrer"');
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeCurriculumHtml("")).toBe("");
  });
});
