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
 * 三种导航形态，由 index.css 里的 .nav-* 按「指针类型 + 宽度」决定显示哪一个：
 *
 *            <768px        768px 以上
 *   触屏     底栏          图标栏
 *   鼠标     底栏          图标栏（≥1024px 换成完整侧边栏）
 *
 * 关键一条：触屏设备永远不用 224px 的桌面侧边栏。安卓平板横屏普遍在 1280px 以上，
 * 只看宽度会直接落到桌面布局，整页看上去就变成了一套后台管理系统。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(1000);
  const settingsError = useSettingsStore((state) => state.error);
  const presetsError = usePresetStore((state) => state.error);
  const error = settingsError ?? presetsError;

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* 桌面宽屏：完整侧边栏 */}
      <aside className="nav-sidebar w-56 shrink-0 flex-col gap-6 border-r border-foreground/10 bg-surface px-4 py-6">
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

      {/*
        中等宽度与触屏平板：只留图标的竖栏。
        触屏上没有 hover，所以补 title 不给提示，靠图标本身和底部的文字版导航区分，
        触控目标给到 48px，手指点得准。
      */}
      <aside className="nav-rail w-[84px] shrink-0 flex-col items-center gap-4 border-r border-foreground/10 bg-surface py-5">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-lamp-soft">
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
                  "flex size-12 items-center justify-center rounded-field transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-default active:bg-default",
                )
              }
            >
              <item.icon className="size-[22px]" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-2.5 md:px-6 md:py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* 品牌只在底栏形态下进顶栏；侧边栏与 tab 栏里都有标识 */}
            <span className="flex items-center gap-2 md:hidden">
              <BrandMark className="size-6" />
              <span className="text-sm font-semibold">青灯</span>
            </span>
            <span className="hidden text-sm text-muted md:inline">{formatDateLabel(now)}</span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="today-compact">
              <TodaySummary variant="compact" />
            </span>
            <span className="clock-digits text-xl font-semibold md:text-2xl">
              {formatTimeOfDay(now, true)}
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* 手机上顶栏放不下灯位，改成顶栏下面一条细带 */}
        <TodaySummary variant="strip" />

        {error ? (
          <div className="border-b border-danger/30 bg-danger-soft px-4 py-2 text-xs text-danger md:px-6 lg:px-8">
            本地数据读取失败：{error}
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-5 md:pb-8 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>

      <nav className="nav-bottom fixed inset-x-0 bottom-0 z-20 items-stretch border-t border-foreground/10 bg-surface pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors",
                isActive ? "text-accent" : "text-muted",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-accent-soft",
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                <span className="text-[0.7rem] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
