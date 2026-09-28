import { Button, Chip } from "@heroui/react";
import { Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ClockFaceView } from "@/components/clock/ClockFaceView";
import { TimerControls } from "@/components/timer/TimerControls";
import { useClockView } from "@/hooks/useClockView";
import { useNow } from "@/hooks/useNow";
import { formatDateLabel, formatTimeOfDay } from "@/lib/time";
import { isTouchPrimary } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { TimerStatus } from "@/lib/types";
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
      <header className="flex items-start justify-between gap-6 p-8">
        <div className={cn("flex flex-col gap-0.5", alwaysShowClock ? "opacity-100" : chromeClass)}>
          <span className="clock-digits text-4xl font-semibold text-foreground">
            {formatTimeOfDay(now, true)}
          </span>
          <span className="text-sm text-muted">{formatDateLabel(now)}</span>
        </div>

        <div className={cn("flex items-center gap-3", chromeClass)}>
          <Chip color="accent">{presetName}</Chip>
          <Button variant="secondary" isIconOnly aria-label="退出沉浸模式" onPress={exit}>
            <Minimize2 className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-10">
        <ClockFaceView face={clockFace} size="lg" {...clock} />
        {taskName ? (
          <p className="max-w-[520px] truncate text-lg text-muted">{taskName}</p>
        ) : (
          <p className="text-lg text-muted">{STATUS_HINTS[status]}</p>
        )}
      </main>

      <footer className={cn("flex flex-col items-center gap-3 pb-10", chromeClass)}>
        <TimerControls variant="immersive" />
        <span className="text-xs text-muted">
          {isTouchPrimary() ? "轻点屏幕唤出控制栏" : "按 Esc 或右上角按钮退出沉浸模式"}
          {alwaysShowClock ? "，当前时间常驻显示" : ""}
        </span>
      </footer>
    </div>
  );
}
