import { useEffect, useState, type CSSProperties } from "react";
import { splitClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ClockViewProps } from "./types";

const FLIP_DURATION_MS = 380;
const FOLD_MS = 160;

/**
 * 卡片尺寸与字号都按容器宽度取比例，与圆环、常态钟保持一致的一套做法，
 * 位数多的时长和窄屏都不会把一行数字撑出屏幕。
 * 高度取宽度的 1.5 倍，是原本 h-24 / w-16 的比例。
 */
const CARD_CLASSES = "h-[18cqw] w-[12cqw] text-[11.25cqw]";
const COLON_CLASSES = "mx-[2cqw] text-[7cqw]";

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
        side === "top" ? "top-0 rounded-t-lg" : "bottom-0 rounded-b-lg",
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
function FlipDigit({ value }: { value: string }) {
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
    <div className="mx-[0.5cqw]" style={{ perspective: "760px" }}>
      <div
        className={cn(
          "relative rounded-lg border border-foreground/5 bg-surface shadow-md",
          CARD_CLASSES,
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

  return (
    <div
      className={cn(
        "clock-box flex w-full flex-col items-center gap-6",
        size === "lg" ? "max-w-[min(880px,100%)]" : "max-w-[min(640px,100%)]",
      )}
    >
      <span className="text-xs font-medium tracking-[0.3em] text-muted uppercase">{label}</span>
      <div className="flex items-center">
        {text.split("").map((char, index) =>
          char === ":" ? (
            <span
              key={`separator-${index}`}
              className={cn(
                "clock-digits",
                tone === "focus" ? "text-accent" : "text-ring-break",
                COLON_CLASSES,
              )}
            >
              :
            </span>
          ) : (
            <FlipDigit key={`digit-${index}`} value={char} />
          ),
        )}
      </div>
      {sublabel ? <span className="text-center text-sm text-muted">{sublabel}</span> : null}
    </div>
  );
}
