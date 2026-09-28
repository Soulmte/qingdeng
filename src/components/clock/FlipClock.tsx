import { useEffect, useState, type CSSProperties } from "react";
import { splitClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ClockSize, ClockViewProps } from "./types";

const FLIP_DURATION_MS = 380;
const FOLD_MS = 160;

const SIZE_CLASSES: Record<ClockSize, string> = {
  md: "h-24 w-16 text-6xl",
  lg: "h-40 w-28 text-8xl",
};

function Half({
  value,
  side,
  style,
}: {
  value: string;
  side: "top" | "bottom";
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden bg-surface",
        side === "top" ? "top-0 rounded-t-xl" : "bottom-0 rounded-b-xl",
      )}
      style={style}
    >
      <span
        className={cn(
          "clock-digits absolute inset-x-0 flex h-[200%] items-center justify-center font-semibold text-foreground",
          side === "top" ? "top-0" : "bottom-0",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** 单个翻页数字：上半页向下折走，下半页随后翻上来 */
function FlipDigit({ value, size }: { value: string; size: ClockSize }) {
  const [state, setState] = useState({ current: value, previous: value, flipping: false });

  useEffect(() => {
    setState((prev) =>
      prev.current === value ? prev : { current: value, previous: prev.current, flipping: true },
    );
  }, [value]);

  useEffect(() => {
    if (!state.flipping) return;
    const timer = window.setTimeout(
      () => setState((prev) => ({ ...prev, flipping: false })),
      FLIP_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [state.flipping, state.current]);

  const { current, previous, flipping } = state;

  return (
    <div className="mx-0.5" style={{ perspective: "760px" }}>
      <div
        className={cn(
          "relative rounded-xl border border-foreground/5 bg-surface shadow-md",
          SIZE_CLASSES[size],
        )}
      >
        <Half value={current} side="top" />
        <Half value={flipping ? previous : current} side="bottom" />

        {flipping ? (
          <>
            <Half
              key={`fold-${current}`}
              value={previous}
              side="top"
              style={{
                transformOrigin: "bottom",
                backfaceVisibility: "hidden",
                animation: `flip-fold ${FOLD_MS}ms ease-in forwards`,
              }}
            />
            <Half
              key={`unfold-${current}`}
              value={current}
              side="bottom"
              style={{
                transformOrigin: "top",
                backfaceVisibility: "hidden",
                animation: `flip-unfold ${FLIP_DURATION_MS - FOLD_MS}ms ${FOLD_MS}ms ease-out both`,
              }}
            />
          </>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/10" />
      </div>
    </div>
  );
}

/** 翻页钟：每位数字一张卡片，靠 CSS 3D 折叠还原翻页手感 */
export function FlipClock({ ms, label, sublabel, tone, size = "md" }: ClockViewProps) {
  const { text } = splitClock(ms);
  const large = size === "lg";

  return (
    <div className="flex flex-col items-center gap-6">
      <span className="text-xs font-medium tracking-[0.3em] text-muted uppercase">{label}</span>
      <div className="flex items-center">
        {text.split("").map((char, index) =>
          char === ":" ? (
            <span
              key={`separator-${index}`}
              className={cn(
                "clock-digits",
                tone === "focus" ? "text-accent" : "text-ring-break",
                large ? "mx-3 text-6xl" : "mx-2 text-4xl",
              )}
            >
              :
            </span>
          ) : (
            <FlipDigit key={`digit-${index}`} value={char} size={size} />
          ),
        )}
      </div>
      {sublabel ? <span className="text-sm text-muted">{sublabel}</span> : null}
    </div>
  );
}
