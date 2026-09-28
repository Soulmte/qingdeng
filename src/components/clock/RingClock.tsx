import { useId } from "react";
import { splitClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clockTextClass } from "./text-scale";
import type { ClockViewProps } from "./types";

const VIEW_BOX = 300;
const CENTER = VIEW_BOX / 2;
const STROKE = 14;
/** 圆环外侧留给刻度区的宽度，按 viewBox 单位算 */
const TICK_GAP = 26;
const RADIUS = CENTER - STROKE / 2 - TICK_GAP;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 60 格细分刻度，每 5 格加粗一根，读起来像钟表盘 */
const TICKS = Array.from({ length: 60 }, (_, index) => index);
/** 圆环外沿，刻度从这里往外排，与环之间只留一道细缝 */
const RING_OUTER = RADIUS + STROKE / 2;
const TICK_NEAR = RING_OUTER + 3;
const TICK_MINOR_FAR = TICK_NEAR + 4;
const TICK_MAJOR_FAR = TICK_NEAR + 9;
/** 刻度外面再收一条发丝线，像表壳的边缘，把整圈收住 */
const RIM_RADIUS = TICK_MAJOR_FAR + 3;
/** 弧头光点的半径，按进度环的粗细取比例，改 STROKE 时不用另算 */
const BEAD_INNER = STROKE * 0.26;
const BEAD_OUTER = STROKE * 0.44;

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
  const uid = useId();
  const gradientId = `${uid}-progress`;
  const { text } = splitClock(ms);
  const ratio = countup ? (ms % 60000) / 60000 : progress;
  const clamped = Math.min(1, Math.max(0, ratio));
  const dashOffset = CIRCUMFERENCE * (1 - clamped);
  const strokeColor = tone === "focus" ? "var(--ring-focus)" : "var(--ring-break)";

  // 弧头光点落在进度环的圆心上，正好压在圆头端点上
  const headAngle = clamped * Math.PI * 2;
  const headX = CENTER + RADIUS * Math.cos(headAngle);
  const headY = CENTER + RADIUS * Math.sin(headAngle);
  // 刚开始和刚好走满时不留孤零零一个点
  const showBead = clamped > 0.004 && clamped < 0.999;

  return (
    <div className={cn("relative aspect-square w-full", CONTAINER_CLASSES[size])}>
      <svg viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`} className="size-full -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.72" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </linearGradient>
        </defs>

        {TICKS.map((tick) => {
          const major = tick % 5 === 0;
          return (
            <line
              key={tick}
              x1={CENTER}
              y1={CENTER - TICK_NEAR}
              x2={CENTER}
              y2={CENTER - (major ? TICK_MAJOR_FAR : TICK_MINOR_FAR)}
              stroke="var(--ring-mark)"
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
              opacity={major ? 0.7 : 0.35}
              transform={`rotate(${tick * 6} ${CENTER} ${CENTER})`}
            />
          );
        })}

        {/* 刻度外面的发丝线，收住整圈轮廓 */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RIM_RADIUS}
          fill="none"
          stroke="var(--ring-hair)"
          strokeWidth={1}
          opacity={0.45}
        />

        {/* 贴在内侧的细线，让圆环有个里外层次，不至于是一圈光板 */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS - STROKE}
          fill="none"
          stroke="var(--ring-hair)"
          strokeWidth={1}
          opacity={0.45}
        />

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={STROKE}
        />

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-200 ease-linear"
        />

        {showBead ? (
          <g>
            <circle cx={headX} cy={headY} r={BEAD_OUTER} fill="var(--surface)" />
            <circle cx={headX} cy={headY} r={BEAD_INNER} fill={strokeColor} />
          </g>
        ) : null}
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
