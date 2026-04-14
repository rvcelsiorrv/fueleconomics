/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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
        sheet: "0 1px 2px rgb(24 24 27 / 0.05), 0 2px 8px rgb(24 24 27 / 0.04)",
        modal: "0 4px 12px rgb(24 24 27 / 0.06), 0 2px 4px rgb(24 24 27 / 0.04)",
      },
    },
  },
  plugins: [],
};
