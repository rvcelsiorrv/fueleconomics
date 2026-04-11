import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="shop">
      <header className="header">
        <div className="header__inner">
          <div className="logo logo--static">
            <span className="logo__mark" aria-hidden="true" />
            <span className="logo__text">Топливный учёт</span>
          </div>

          <nav className="nav" aria-label="Раздел">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav__link${isActive ? " nav__link--active" : ""}`
              }
            >
              Учёт автопарка
            </NavLink>
          </nav>

          <div className="header__search" role="search">
            <label htmlFor="site-search" className="visually-hidden">
              Поиск по учёту
            </label>
            <input
              id="site-search"
              className="search-input"
              type="search"
              placeholder="Автомобиль, организация, тип системы"
              autoComplete="off"
            />
          </div>

          <div className="header__actions">
            <button
              type="button"
              className="icon-btn theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Включить светлую тему"
                  : "Включить тёмную тему"
              }
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              <span
                className="theme-toggle__icon"
                aria-hidden="true"
                data-mode={theme}
              />
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
