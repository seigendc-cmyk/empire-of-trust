import { useTheme } from "../state/ThemeContext";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "Light" : "Dark";
  return (
    <button className={`btn ${compact ? "min-h-10 px-3 py-2 text-xs" : ""}`} type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`}>
      {compact ? nextTheme : `${theme === "dark" ? "Dark Cinematic" : "Light Executive"} / Switch`}
    </button>
  );
}
