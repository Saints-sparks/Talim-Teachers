/**
 * @jest-environment jsdom
 */
import fs from "fs";
import path from "path";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import config from "../../tailwind.config";
import { ThemeProvider, themeColors } from "@/providers/theme-provider";
import { useDashboardStyles } from "@/components/dashboard/primitives";
import { buttonVariants } from "@/components/ui/button";

/**
 * WCAG AA (4.5:1) guards for the colours behind the e2e contrast report. The
 * ratios are computed from the real sources (globals.css, tailwind.config.ts,
 * the theme palette), so a colour change that drops below AA fails here.
 */
const css = fs.readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const luminance = ([r, g, b]: Rgb) => {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Channels of the `--text-*` variables in the first block that starts with `selector {`. */
function tokensOf(selector: string): Record<string, Rgb> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, Rgb> = {};
  for (const m of block.matchAll(/--(text-[\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return tokens;
}

const WHITE = hex("#ffffff");
/** Light surfaces secondary text sits on: white, the near-white cards and chips, gray-50/100, the blue tints. */
const LIGHT_SURFACES = ["#ffffff", "#fbfbfb", "#f8f8f8", "#f9fafb", "#f5faff", "#eef3f9"].map(hex);
const DARK_SURFACES = ["#0f172a", "#020617", "#0f1629", "#132238"].map(hex);

describe("text tokens", () => {
  const light = tokensOf(":root");
  const dark = tokensOf("html.dark");

  it.each(["text-gray-400", "text-gray-500", "text-slate-400", "text-slate-500"])("light %s is AA on every light surface", (name) => {
    for (const surface of LIGHT_SURFACES) expect(ratio(light[name], surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["text-green-600", "text-yellow-600", "text-red-600"])("light %s is AA on white", (name) => {
    expect(ratio(light[name], WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the ranks: 400 lighter than 500 in both themes", () => {
    for (const set of [light, dark]) {
      expect(luminance(set["text-gray-400"])).toBeGreaterThan(luminance(set["text-gray-500"]));
      expect(luminance(set["text-slate-400"])).toBeGreaterThan(luminance(set["text-slate-500"]));
    }
  });

  it("dark slate-500 clears AA on the dark surfaces (the stock #64748b is 3.8:1)", () => {
    for (const surface of DARK_SURFACES) expect(ratio(dark["text-slate-500"], surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark values never fall below the stock palette's contrast", () => {
    const stock: Record<string, Rgb> = {
      "text-gray-400": [156, 163, 175],
      "text-gray-500": [107, 114, 128],
      "text-slate-400": [148, 163, 184],
      "text-slate-500": [100, 116, 139],
      "text-green-600": [22, 163, 74],
      "text-yellow-600": [202, 138, 4],
      "text-red-600": [220, 38, 38],
    };
    const surface = hex("#0f172a");
    for (const [name, rgb] of Object.entries(stock)) expect(ratio(dark[name], surface)).toBeGreaterThanOrEqual(ratio(rgb, surface));
  });

  it("maps each text utility to its variable, keeping opacity modifiers working", () => {
    const textColor = (config.theme?.extend as { textColor?: Record<string, Record<string, string>> }).textColor ?? {};
    for (const [family, shade] of [["gray", "400"], ["gray", "500"], ["slate", "400"], ["slate", "500"], ["green", "600"], ["yellow", "600"], ["red", "600"]]) {
      expect(textColor[family][shade]).toBe(`rgb(var(--text-${family}-${shade}) / <alpha-value>)`);
    }
  });
});

describe("light-mode hex greys", () => {
  const rules = [...css.matchAll(/:where\(html:not\(\.dark\)\) :is\(([^)]*)\)\s*\{\s*color:\s*(#[0-9a-fA-F]{6});/g)];
  const mapped = new Map<string, string>();
  for (const [, selectors, color] of rules) for (const s of selectors.matchAll(/\\#([0-9A-Fa-f]{6})/g)) mapped.set(s[1].toUpperCase(), color);

  it("covers the greys the e2e report found failing", () => {
    for (const grey of ["878787", "7B7B7B", "8A95A5", "A5A5A5"]) expect(mapped.has(grey)).toBe(true);
  });

  it("maps each to an AA colour on the light surfaces", () => {
    for (const [, color] of mapped) for (const surface of LIGHT_SURFACES) expect(ratio(hex(color), surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("only ever darkens the text", () => {
    for (const [grey, color] of mapped) expect(luminance(hex(color))).toBeLessThan(luminance(hex(`#${grey}`)));
  });
});

describe("dark-mode table headers", () => {
  it("are AA on the slate-700 header bar", () => {
    const color = css.match(/html\.dark thead th \{ color: (#[0-9a-fA-F]{6})/)?.[1];
    expect(color).toBeDefined();
    expect(ratio(hex(color!), hex("#334155"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme palette", () => {
  it.each(["light", "dark"] as const)("%s primary and success text is AA on its surfaces", (mode) => {
    const c = themeColors[mode];
    for (const surface of [c.surface, c.surfaceAlt, c.bg]) {
      for (const text of [c.primary, c.success]) expect(ratio(hex(text), hex(surface))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["light", "dark"] as const)("the %s filled primary action keeps its label AA", async (mode) => {
    localStorage.setItem("talim_teacher_theme", mode);
    const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
    const { result } = renderHook(() => useDashboardStyles(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(ratio(hex(result.current.primaryText), hex(result.current.primaryFill))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("default Button", () => {
  it("has a light label: the navy call-site backgrounds no longer inherit dark body text", () => {
    const classes = buttonVariants();
    expect(classes).toContain("text-white");
    expect(classes).not.toContain("text-primary-foreground"); // not a Tailwind colour here, so it painted nothing
  });
});
