import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, LayoutGrid, Settings, Target, Timer } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TodaySummary } from "@/components/layout/TodaySummary";
import { useNow } from "@/hooks/useNow";
import { formatDateLabel, formatTimeOfDay } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePresetStore } from "@/stores/presetStore";
import { useSettingsStore } from "@/stores/settingsStore";

const NAV_ITEMS = [
  { to: "/", label: "计时", icon: Timer },
  { to: "/tasks", label: "任务", icon: Target },
  { to: "/modes", label: "模式", icon: LayoutGrid },
  { to: "/stats", label: "统计", icon: BarChart3 },
  { to: "/settings", label: "设置", icon: Settings },
];

/**
 * 三种导航形态：
 * - lg 及以上（桌面、平板横屏）：完整侧边栏
 * - md（平板竖屏）：图标栏
 * - md 以下（手机）：底部导航
 */
export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(1000);
  const settingsError = useSettingsStore((state) => state.error);
  const presetsError = usePresetStore((state) => state.error);
  const error = settingsError ?? presetsError;

  return (
    <div className="flex h-full bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-foreground/10 bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lamp-soft">
            <BrandMark className="size-7" pulse />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">青灯</span>
            <span className="text-[0.7rem] text-muted">独对青灯，专注有时</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-default hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <TodaySummary />
      </aside>

      <aside className="hidden w-[76px] shrink-0 flex-col items-center gap-5 border-r border-foreground/10 bg-surface py-5 md:flex lg:hidden">
        <span className="flex size-11 items-center justify-center rounded-xl bg-lamp-soft">
          <BrandMark className="size-7" pulse />
        </span>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  "flex size-11 items-center justify-center rounded-field transition-colors",
                  isActive ? "bg-accent-soft text-accent" : "text-muted hover:bg-default",
                )
              }
            >
              <item.icon className="size-5" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3 md:px-6 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex items-center gap-2 lg:hidden">
              <BrandMark className="size-6 md:hidden" />
              <span className="text-sm font-semibold">青灯</span>
            </span>
            <span className="hidden text-sm text-muted lg:inline">{formatDateLabel(now)}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block lg:hidden">
              <TodaySummary variant="compact" />
            </span>
            <span className="clock-digits text-xl font-semibold lg:text-2xl">
              {formatTimeOfDay(now, true)}
            </span>
            <ThemeToggle />
          </div>
        </header>

        {error ? (
          <div className="border-b border-danger/30 bg-danger-soft px-4 py-2 text-xs text-danger md:px-6 lg:px-8">
            本地数据读取失败：{error}
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-8 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-foreground/10 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                isActive ? "text-accent" : "text-muted",
              )
            }
          >
            <item.icon className="size-5" />
            <span className="text-[0.65rem] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
