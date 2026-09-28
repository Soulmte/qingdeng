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
        "flex w-full flex-col items-center gap-7",
        size === "lg" ? "max-w-[880px]" : "max-w-[640px]",
      )}
    >
      <span className="text-xs font-medium tracking-[0.3em] text-muted uppercase">{label}</span>
      <span
        className={cn(
          "clock-digits font-semibold leading-none text-foreground",
          clockTextClass("plain", size, text),
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
      {sublabel ? <span className="text-sm text-muted">{sublabel}</span> : null}
    </div>
  );
}
