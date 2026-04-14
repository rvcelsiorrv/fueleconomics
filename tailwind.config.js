import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      /* Тёплые нейтрали + согласованный акцент: классы zinc/blue в коде сохраняются. */
      colors: {
        zinc: colors.stone,
        blue: colors.teal,
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        sheet:
          "0 1px 2px rgb(28 25 23 / 0.05), 0 2px 8px rgb(28 25 23 / 0.04)",
        modal:
          "0 4px 12px rgb(28 25 23 / 0.06), 0 2px 4px rgb(28 25 23 / 0.04)",
      },
    },
  },
  plugins: [],
};
