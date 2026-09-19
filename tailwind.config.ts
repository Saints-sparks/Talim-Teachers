import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      // Text colours that miss WCAG AA (4.5:1) on white in the stock palette: the
      // 400/500 greys (~2.5-4.8:1) and the 600 status colours (~3-4.4:1). Light mode
      // reads them from variables (globals.css); dark mode keeps the stock values,
      // except slate-500, which is raised (the stock value is 3.8:1 on slate-900).
      // Only text is affected: bg-, border- and ring- still use the stock palette.
      textColor: {
        gray: {
          "400": "rgb(var(--text-gray-400) / <alpha-value>)",
          "500": "rgb(var(--text-gray-500) / <alpha-value>)",
        },
        slate: {
          "400": "rgb(var(--text-slate-400) / <alpha-value>)",
          "500": "rgb(var(--text-slate-500) / <alpha-value>)",
        },
        green: { "600": "rgb(var(--text-green-600) / <alpha-value>)" },
        yellow: { "600": "rgb(var(--text-yellow-600) / <alpha-value>)" },
        red: { "600": "rgb(var(--text-red-600) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'],
        manrope: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;