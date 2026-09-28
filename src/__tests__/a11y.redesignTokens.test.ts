import fs from "fs";
import path from "path";

/**
 * WCAG AA (4.5:1) for the teachers redesign's colour tokens (globals.css,
 * "Teachers redesign tokens"), in both themes, on every surface they are
 * used on.
 */
const css = fs.readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");
const section = css.slice(css.indexOf("Teachers redesign tokens"));

type Rgb = [number, number, number];
const luminance = ([r, g, b]: Rgb) => {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Reads the `--tl-*` channels of the first block opened by `selector {` in the redesign section.
 *
 * @param selector - `:root` or `html.dark`.
 * @returns Token name → channels.
 */
function tokens(selector: string): Record<string, Rgb> {
  const start = section.indexOf(`${selector} {`);
  const block = section.slice(start, section.indexOf("}", start));
  const out: Record<string, Rgb> = {};
  for (const m of block.matchAll(/--tl-([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

const PAIRS: Array<[string, string[]]> = [
  ["ink", ["surface", "subtle", "today", "bg"]],
  ["body", ["surface"]],
  ["muted", ["surface", "subtle", "today", "bg", "select"]],
  ["faint", ["surface", "subtle", "today"]],
  ["brand", ["surface", "select", "bg"]],
  ["link", ["surface"]],
  ["success", ["surface", "success-bg", "success-soft"]],
  ["warning", ["surface", "warning-bg"]],
  ["danger", ["surface", "danger-bg"]],
  ["accent", ["surface", "accent-bg"]],
  ["on-brand", ["brand-fill", "now"]],
];

describe.each([":root", "html.dark"])("%s redesign tokens", (selector) => {
  const t = tokens(selector);

  it("defines every token in both themes", () => {
    expect(Object.keys(t).length).toBeGreaterThanOrEqual(28);
  });

  it.each(PAIRS)("%s text is AA on its surfaces", (text, surfaces) => {
    for (const surface of surfaces) {
      expect(ratio(t[text], t[surface])).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("subject tones", () => {
  const tone = (selector: string, i: number) => {
    const m = section.match(new RegExp(`${selector.replace(".", "\\.")}\\.tl-tone-${i} \\{ --tone-bg: (\\d+) (\\d+) (\\d+);\\s+--tone-fg: (\\d+) (\\d+) (\\d+);`));
    if (!m) throw new Error(`tone ${i} missing for ${selector}`);
    const n = m.slice(1).map(Number);
    return { bg: n.slice(0, 3) as Rgb, fg: n.slice(3, 6) as Rgb };
  };

  it.each([0, 1, 2, 3, 4, 5])("tone %i keeps its text AA on its tint in both themes", (i) => {
    for (const selector of ["", "html.dark "]) {
      const { bg, fg } = tone(selector, i);
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
