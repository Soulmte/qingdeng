import { useTimerStore } from "@/stores/timerStore";
import { cn } from "@/lib/utils";

/** 一轮里的番茄进度点，只在有休息安排的模式下出现 */
export function RoundTrack() {
  const preset = useTimerStore((state) => state.preset);
  const round = useTimerStore((state) => state.round);
  const phase = useTimerStore((state) => state.phase);

  const total = preset.kind === "countup" ? 0 : preset.roundsPerSet;
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">
        第 {round} / {total} 轮
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const done = position < round || (position === round && phase !== "focus");
          const active = position === round && phase === "focus";
          return (
            <span
              key={position}
              className={cn(
                "size-2 rounded-full transition-colors",
                done && "bg-accent",
                active && "bg-accent/40 ring-1 ring-accent",
                !done && !active && "bg-ring-track",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
