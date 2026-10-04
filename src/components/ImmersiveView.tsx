import { Button, Chip } from "@heroui/react";
import { Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ClockFaceView } from "@/components/clock/ClockFaceView";
import { TimerControls } from "@/components/timer/TimerControls";
import { useClockView } from "@/hooks/useClockView";
import { useNow } from "@/hooks/useNow";
import { countdownParts, formatRemaining } from "@/lib/countdown";
import { formatDateLabel, formatTimeOfDay } from "@/lib/time";
import { isTouchPrimary } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { CountdownRecord, TimerStatus } from "@/lib/types";
import { useCountdownStore } from "@/stores/countdownStore";
import { useImmersiveStore } from "@/stores/immersiveStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";

const IDLE_HIDE_MS = 3200;

const STATUS_HINTS: Record<TimerStatus, string> = {
  idle: "准备好后按空格或开始按钮",
  running: "专注进行中",
  paused: "已暂停，随时继续",
  finished: "这一段已经完成",
};

/**
 * 沉浸界面里的一条倒计时。
 * inline 用在与时钟同一列（窄屏），stacked 用在右侧栏（宽屏），对齐方式不同。
 */
function PinnedCountdown({
  item,
  now,
  layout,
}: {
  item: CountdownRecord;
  now: Date;
  layout: "inline" | "stacked";
}) {
  const parts = countdownParts(item.targetAt, now);

  if (layout === "inline") {
    return (
      <span className="flex items-baseline gap-2">
        <span className="text-sm text-muted">{item.title}</span>
        <span
          className={cn(
            "clock-digits text-base font-semibold sm:text-lg",
            parts.past ? "text-muted" : "text-foreground",
          )}
        >
          {formatRemaining(parts)}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span className="text-sm text-muted">{item.title}</span>
      <span
        className={cn(
          "clock-digits text-2xl font-semibold",
          parts.past ? "text-muted" : "text-foreground",
        )}
      >
        {formatRemaining(parts)}
      </span>
    </div>
  );
}

/** 沉浸模式：自动全屏、隐藏干扰信息，顶部始终显示当前时间 */
export function ImmersiveView() {
  const active = useImmersiveStore((state) => state.active);
  const exit = useImmersiveStore((state) => state.exit);
  const clockFace = useSettingsStore((state) => state.clockFace);
  const alwaysShowClock = useSettingsStore((state) => state.immersiveAlwaysShowClock);
  const presetName = useTimerStore((state) => state.preset.name);
  const status = useTimerStore((state) => state.status);
  const taskName = useTimerStore((state) => state.taskName);
  const clock = useClockView();
  const now = useNow(1000);
  const [controlsVisible, setControlsVisible] = useState(true);

  // 只显示标记过的那几条；沉浸模式里它们是安静的一条信息，不是控件，
  // 所以不跟着控制栏一起淡出
  const countdowns = useCountdownStore((state) => state.countdowns);
  const pinned = countdowns.filter((item) => item.showInImmersive);

  useEffect(() => {
    if (!active) return;

    let idleTimer: number | null = null;
    const wake = () => {
      setControlsVisible(true);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setControlsVisible(false), IDLE_HIDE_MS);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
      else wake();
    };

    wake();
    window.addEventListener("mousemove", wake);
    // 触屏上没有鼠标移动，按下就算一次活动，点一下即可唤出控制栏
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", onKeyDown);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
    };
  }, [active, exit]);

  if (!active) return null;

  const chromeClass = cn(
    "transition-opacity duration-500",
    controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 flex animate-[immersive-enter_220ms_ease-out] flex-col bg-background",
        !controlsVisible && "cursor-none",
      )}
    >
      <header className="flex items-start justify-between gap-4 p-5 sm:gap-6 sm:p-8">
        <div className={cn("flex flex-col gap-0.5", alwaysShowClock ? "opacity-100" : chromeClass)}>
          <span className="clock-digits text-3xl font-semibold text-foreground sm:text-4xl">
            {formatTimeOfDay(now, true)}
          </span>
          <span className="text-sm text-muted">{formatDateLabel(now)}</span>
        </div>

        <div className={cn("flex items-center gap-2.5 sm:gap-3", chromeClass)}>
          <Chip color="accent">{presetName}</Chip>
          <Button variant="secondary" isIconOnly aria-label="退出沉浸模式" onPress={exit}>
            <Minimize2 className="size-4" />
          </Button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-5 sm:gap-8 sm:px-10">
        <ClockFaceView face={clockFace} size="lg" {...clock} />
        {taskName ? (
          <p className="max-w-[520px] truncate text-base text-muted sm:text-lg">{taskName}</p>
        ) : (
          <p className="text-base text-muted sm:text-lg">{STATUS_HINTS[status]}</p>
        )}

        {pinned.length > 0 ? (
          <>
            {/* 窄屏没有富余的横向空间，倒计时跟在时钟下方 */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 xl:hidden">
              {pinned.map((item) => (
                <PinnedCountdown key={item.id} item={item} now={now} layout="inline" />
              ))}
            </div>
            {/* 宽屏时钟居中、两侧留白很多，倒计时安静地落在右栏 */}
            <div className="pointer-events-none absolute inset-y-0 right-8 hidden flex-col items-end justify-center gap-5 xl:flex xl:right-10">
              {pinned.map((item) => (
                <PinnedCountdown key={item.id} item={item} now={now} layout="stacked" />
              ))}
            </div>
          </>
        ) : null}
      </main>

      <footer
        className={cn(
          "flex flex-col items-center gap-3 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-10 sm:pb-10",
          chromeClass,
        )}
      >
        <TimerControls variant="immersive" />
        <span className="text-xs text-muted">
          {isTouchPrimary() ? "轻点屏幕唤出控制栏" : "按 Esc 或右上角按钮退出沉浸模式"}
          {alwaysShowClock ? "，当前时间常驻显示" : ""}
        </span>
      </footer>
    </div>
  );
}
