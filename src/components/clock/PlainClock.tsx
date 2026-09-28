import { splitClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clockTextClass } from "./text-scale";
import type { ClockViewProps } from "./types";

/** 常态倒计时：大字号 + 一条细进度条，信息密度最低 */
export function PlainClock({ ms, progress, label, sublabel, countup, size = "md" }: ClockViewProps) {
  const { text } = splitClock(ms);
  const percent = Math.round((countup ? 1 : progress) * 1000) / 10;

  return (
    <div
      className={cn(
        "clock-box flex w-full flex-col items-center gap-6 sm:gap-7",
        size === "lg" ? "max-w-[min(880px,100%)]" : "max-w-[min(640px,100%)]",
      )}
    >
      <span className="text-xs font-medium tracking-[0.3em] text-muted uppercase">{label}</span>
      <span
        className={cn(
          "clock-digits font-semibold leading-none text-foreground",
          clockTextClass("plain", text),
        )}
      >
        {text}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ring-track">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${countup ? 100 : percent}%` }}
        />
      </div>
      {sublabel ? <span className="text-center text-sm text-muted">{sublabel}</span> : null}
    </div>
  );
}
