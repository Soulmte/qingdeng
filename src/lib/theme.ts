import { useTheme } from "@heroui/react";

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

/** 与 HeroUI useTheme 共用同一个存储键，避免两套主题状态打架 */
export const THEME_STORAGE_KEY = "heroui-theme";

export function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "light";
}

/**
 * 首屏渲染前先把主题类挂到 documentElement，避免暗色场景下白屏闪一下。
 * HeroUI 的 useTheme 后续会接管同一个类。
 */
export function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove(mode === "dark" ? "light" : "dark");
  root.classList.add(mode);
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode;
}

export function resolveTheme(preference: ThemePreference): ThemeMode {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useAppTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme("light");
  const resolved = (resolvedTheme as ThemeMode | undefined) ?? "light";

  return {
    preference: (theme as ThemePreference) ?? "light",
    resolved,
    isDark: resolved === "dark",
    setTheme,
    toggle: () => setTheme(resolved === "dark" ? "light" : "dark"),
  };
}
