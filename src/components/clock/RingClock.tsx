import { splitClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clockTextClass } from "./text-scale";
import type { ClockViewProps } from "./types";

const VIEW_BOX = 300;
const STROKE = 14;
/** 刻度与圆环之间留出的间距，按 viewBox 单位计算 */
const TICK_GAP = 26;
const RADIUS = VIEW_BOX / 2 - STROKE / 2 - TICK_GAP;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TICKS = Array.from({ length: 12 }, (_, index) => index);

const CONTAINER_CLASSES = {
  md: "max-w-[min(520px,46vh)]",
  lg: "max-w-[min(760px,62vh)]",
};

/** 圆环钟：外圈表示阶段进度，正计时时改为一分钟一圈 */
export function RingClock({
  ms,
  progress,
  label,
  sublabel,
  tone,
  countup,
  running,
  size = "md",
}: ClockViewProps) {
  const { text } = splitClock(ms);
  const ratio = countup ? (ms % 60000) / 60000 : progress;
  const dashOffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, ratio)));
  const strokeColor = tone === "focus" ? "var(--ring-focus)" : "var(--ring-break)";

  return (
    <div className={cn("relative aspect-square w-full", CONTAINER_CLASSES[size])}>
      <svg viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`} className="size-full -rotate-90">
        {TICKS.map((tick) => (
          <line
            key={tick}
            x1={VIEW_BOX / 2}
            y1={10}
            x2={VIEW_BOX / 2}
            y2={22}
            stroke="var(--ring-track)"
            strokeWidth={2.5}
            strokeLinecap="round"
            transform={`rotate(${tick * 30} ${VIEW_BOX / 2} ${VIEW_BOX / 2})`}
          />
        ))}
        <circle
          cx={VIEW_BOX / 2}
          cy={VIEW_BOX / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={STROKE}
        />
        <circle
          cx={VIEW_BOX / 2}
          cy={VIEW_BOX / 2}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-200 ease-linear"
        />
      </svg>

      {running ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-[16%] rounded-full opacity-20 blur-3xl",
            tone === "focus" ? "bg-accent" : "bg-ring-break",
          )}
        />
      ) : null}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <span className="text-[0.7rem] font-medium tracking-[0.3em] text-muted uppercase">{label}</span>
        <span
          className={cn(
            "clock-digits font-semibold leading-none text-foreground",
            clockTextClass("ring", size, text),
          )}
        >
          {text}
        </span>
        {sublabel ? (
          <span className="max-w-[76%] truncate text-center text-sm text-muted">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
