import { Button } from "antd";
import { Outlet } from "react-router-dom";
import FuelPumpMark from "../components/icons/FuelPumpMark";
import { useTheme } from "../context/ThemeContext";

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-full w-full bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-none items-center justify-between gap-4 px-3 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-blue-700 shadow-[inset_0_0_0_1px_rgb(29_78_216/0.12)] dark:border-zinc-600 dark:bg-zinc-900 dark:text-blue-400 dark:shadow-[inset_0_0_0_1px_rgb(96_165_250/0.2)]"
              aria-hidden
            >
              <FuelPumpMark className="h-[22px] w-[22px]" />
            </span>
            <span className="truncate text-lg font-bold tracking-tight">
              Учёт ремонта топливных систем
            </span>
          </div>

          <div className="shrink-0">
            <Button
              type="text"
              className="grid !h-9 !w-9 min-h-9 min-w-9 place-items-center rounded-lg border border-transparent text-zinc-900 hover:!border-zinc-200 hover:!bg-zinc-100 dark:text-zinc-100 dark:hover:!border-zinc-700 dark:hover:!bg-zinc-900"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Включить светлую тему"
                  : "Включить тёмную тему"
              }
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              icon={
                theme === "dark" ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )
              }
            />
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
