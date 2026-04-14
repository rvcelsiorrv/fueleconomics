import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-full w-full bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto grid max-w-none grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] items-center gap-x-4 gap-y-3 px-3 py-3.5 sm:px-5 min-[900px]:grid-cols-[auto_auto_1fr_auto] min-[900px]:grid-rows-1 min-[900px]:gap-x-5">
          <div className="col-start-1 row-start-1 flex items-center gap-2.5">
            <span
              className="relative h-[34px] w-[34px] shrink-0 rounded-lg border border-zinc-200 bg-white shadow-[inset_0_0_0_1px_rgb(29_78_216/0.12)] dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-[inset_0_0_0_1px_rgb(96_165_250/0.16)]"
              aria-hidden
            >
              <span className="absolute inset-x-1.5 inset-y-2 rounded-sm bg-gradient-to-b from-blue-600 to-blue-700 opacity-95 dark:from-blue-400 dark:to-blue-500" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Топливный учёт
            </span>
          </div>

          <nav
            className="col-span-3 col-start-1 row-start-2 flex flex-wrap items-center gap-1 min-[900px]:col-span-1 min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:justify-center"
            aria-label="Раздел"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "border border-blue-600/25 bg-blue-50 text-zinc-900 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-zinc-50"
                    : "border border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                ].join(" ")
              }
            >
              Учёт автопарка
            </NavLink>
          </nav>

          <div
            className="col-start-2 row-start-1 min-[900px]:col-start-3"
            role="search"
          >
            <label htmlFor="site-search" className="sr-only">
              Поиск по учёту
            </label>
            <input
              id="site-search"
              className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              type="search"
              placeholder="Автомобиль, организация, тип системы"
              autoComplete="off"
            />
          </div>

          <div className="col-start-3 row-start-1 justify-self-end min-[900px]:col-start-4">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md border border-transparent text-zinc-900 transition hover:border-zinc-200 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Включить светлую тему"
                  : "Включить тёмную тему"
              }
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? (
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
              )}
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
