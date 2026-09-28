import { PHASE_LABELS, phaseDurationSeconds } from "@/lib/presets";
import { formatTimeOfDay } from "@/lib/time";
import type { ClockTone } from "@/components/clock/types";
import { useTimerStore } from "@/stores/timerStore";

/** 把计时状态换算成三种时钟共用的展示数据 */
export function useClockView() {
  const preset = useTimerStore((state) => state.preset);
  const phase = useTimerStore((state) => state.phase);
  const round = useTimerStore((state) => state.round);
  const status = useTimerStore((state) => state.status);
  const elapsedMs = useTimerStore((state) => state.elapsedMs);
  const sessionStartedAtMs = useTimerStore((state) => state.sessionStartedAtMs);

  const totalMs = phaseDurationSeconds(preset, phase) * 1000;
  const countup = preset.kind === "countup";
  const ms = countup ? elapsedMs : Math.max(0, totalMs - elapsedMs);
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0;
  const running = status === "running";
  const tone: ClockTone = phase === "focus" ? "focus" : "break";
  const roundLabel = !countup && preset.roundsPerSet > 1 ? `第 ${round} / ${preset.roundsPerSet} 轮` : "";

  let sublabel = roundLabel;
  if (countup) {
    sublabel = running
      ? `开始于 ${formatTimeOfDay(new Date(sessionStartedAtMs ?? Date.now()))}`
      : "不计总时长，手动结束";
  } else if (status === "finished") {
    sublabel = "本段计时已完成";
  } else if (running) {
    const endAt = new Date(Date.now() + ms);
    sublabel = `${roundLabel ? `${roundLabel} · ` : ""}预计 ${formatTimeOfDay(endAt)} 结束`;
  }

  return {
    ms,
    progress,
    tone,
    running,
    countup,
    sublabel,
    label: PHASE_LABELS[phase],
  };
}
