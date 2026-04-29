import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

/**
 * Colors needed by recharts SVG elements.
 * Recharts SVG props (stroke, fill) can't reliably read CSS custom properties,
 * so these are resolved to actual hex values at render time.
 */
export interface ChartColors {
  grid: string;      // CartesianGrid stroke
  line: string;      // Line / Area stroke
  refLine: string;   // ReferenceLine stroke
  axisText: string;  // XAxis / YAxis tick fill
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
}

const CHART_COLORS: Record<Theme, ChartColors> = {
  light: {
    grid: "#ede9fe",
    line: "#8b5cf6",
    refLine: "#c4b5fd",
    axisText: "#7c6fa0",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e4e0f5",
    tooltipText: "#1e1b4b",
    tooltipMuted: "#7c6fa0",
  },
  dark: {
    grid: "#2d2b55",
    line: "#a78bfa",
    refLine: "#4c4577",
    axisText: "#8b7cb6",
    tooltipBg: "#1e1b3a",
    tooltipBorder: "#2d2b55",
    tooltipText: "#f1f5f9",
    tooltipMuted: "#8b7cb6",
  },
};

export interface ThemeContextType {
  theme: Theme;
  chart: ChartColors;
  toggleTheme: () => void;
}

const defaultCtx: ThemeContextType = {
  theme: "light",
  chart: CHART_COLORS.light,
  toggleTheme: () => {},
};

export const ThemeContext = createContext<ThemeContextType>(defaultCtx);
export const useTheme = () => useContext(ThemeContext);
export { CHART_COLORS };
