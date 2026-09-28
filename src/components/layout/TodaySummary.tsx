import { ProgressBar } from "@heroui/react";
import { LampUnit } from "@/components/BrandMark";
import { useTodaySummary } from "@/hooks/useTodaySummary";
import { useSettingsStore } from "@/stores/settingsStore";

/** 灯位上限，超过的部分用数字补足 */
const MAX_LAMPS = 8;

interface TodaySummaryProps {
  /** full 用于侧边栏，compact 用于平板与手机的顶栏 */
  variant?: "full" | "compact";
}

export function TodaySummary({ variant = "full" }: TodaySummaryProps) {
  const { focusMinutes, completedRounds } = useTodaySummary();
  const goal = useSettingsStore((state) => state.dailyGoalMinutes);
  const percent = Math.min(100, Math.round((focusMinutes / Math.max(1, goal)) * 100));

  // 灯位按每日目标换算（一段按 25 分钟估），至少 4 盏最多 8 盏
  const slots = Math.min(MAX_LAMPS, Math.max(4, Math.ceil(goal / 25)));
  const lit = Math.min(completedRounds, slots);
  const overflow = completedRounds - lit;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-default px-3 py-1.5">
        <span className="flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: slots }, (_, index) => (
            <LampUnit key={index} lit={index < lit} className="size-3.5 shrink-0" />
          ))}
        </span>
        <span className="text-xs font-medium text-foreground">
          {completedRounds} 盏{overflow > 0 ? ` +${overflow}` : ""}
        </span>
        <span className="clock-digits text-xs text-muted">
          {focusMinutes}/{goal}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-field bg-default p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">今日点亮</span>
        <span className="clock-digits text-xs text-muted">
          <span className="text-sm font-semibold text-foreground">{focusMinutes}</span>
          /{goal} 分钟
        </span>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: slots }, (_, index) => (
          <LampUnit key={index} lit={index < lit} className="size-4 shrink-0" />
        ))}
        {overflow > 0 ? (
          <span className="ml-1 text-xs font-medium text-accent">+{overflow}</span>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{completedRounds} 盏青灯</span>
        <span className="text-[0.7rem] text-muted">{percent}%</span>
      </div>

      <ProgressBar value={percent} aria-label="今日专注目标完成度">
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}
