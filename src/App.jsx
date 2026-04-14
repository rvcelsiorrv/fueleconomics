import { ConfigProvider, theme } from "antd";
import ruRU from "antd/locale/ru_RU";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import MainLayout from "./layout/MainLayout";
import FuelSystemsPage from "./pages/FuelSystemsPage";

function AntdThemeRoot({ children }) {
  const { theme: colorMode } = useTheme();
  return (
    <ConfigProvider
      locale={ruRU}
      componentSize="middle"
      theme={{
        algorithm:
          colorMode === "dark"
            ? theme.darkAlgorithm
            : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0d9488",
          borderRadius: 8,
          borderRadiusLG: 8,
          borderRadiusSM: 8,
          borderRadiusXS: 8,
          controlHeight: 36,
          controlHeightLG: 36,
          controlHeightSM: 36,
          fontSize: 14,
          lineHeight: 1.5714285714285714,
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Select: {
            borderRadius: 8,
            controlHeight: 36,
          },
          DatePicker: {
            borderRadius: 8,
            controlHeight: 36,
          },
          InputNumber: {
            borderRadius: 8,
            controlHeight: 36,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AntdThemeRoot>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<FuelSystemsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntdThemeRoot>
    </ThemeProvider>
  );
}
