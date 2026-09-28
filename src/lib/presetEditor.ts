import type { PresetDraft } from "./types";
import { formatDurationLabel } from "./time";

/**
 * 步进器的取值会吸附到 min + n×step 的网格上，
 * 所以步长必须能整除常用取值，否则用户输入 120 会被吸到 115。
 */
export const GOAL_MIN = 5;
export const GOAL_MAX = 960;
export const GOAL_STEP = 5;

export const DURATION_MINUTE_STEP = 5;
export const DURATION_MAX_HOURS = 12;
/** 分钟与秒都限定在一个进位区间内，跨进位由上一档承担 */
export const DURATION_MAX_MINUTES = 55;
export const DURATION_MAX_SECONDS = 55;

/** 常用专注时长，一键填入，避免一路点 + */
export const FOCUS_QUICK_MINUTES = [15, 25, 30, 45, 50, 60, 90];

/** 把模板配置写成一句人话，让用户确认它到底怎么跑 */
export function describePresetCycle(draft: PresetDraft) {
  if (draft.kind === "countup") {
    return "正计时不设总时长，也不排休息，结束时手动停止并记录。";
  }

  const focus = formatDurationLabel(draft.focusSeconds);
  const hasBreaks = draft.shortBreakSeconds > 0 || draft.longBreakSeconds > 0;

  if (!hasBreaks) {
    if (draft.roundsPerSet > 1) {
      const auto = draft.autoStartNext ? "，上一段结束自动开始下一段" : "，每段结束需手动开始下一段";
      return `连续完成 ${draft.roundsPerSet} 段专注（每段 ${focus}）后结束，段与段之间不休息${auto}。`;
    }
    return `专注 ${focus}后直接结束，中途不插入休息。`;
  }

  const parts = [`专注 ${focus}`];
  if (draft.shortBreakSeconds > 0) {
    parts.push(`短休息 ${formatDurationLabel(draft.shortBreakSeconds)}`);
  }
  if (draft.longBreakSeconds > 0) {
    parts.push(`长休息 ${formatDurationLabel(draft.longBreakSeconds)}`);
  }

  const rounds = draft.roundsPerSet > 1 ? `，每 ${draft.roundsPerSet} 轮进入长休息` : "";
  const auto = draft.autoStartNext ? "，阶段结束自动接续" : "，阶段结束需手动开始";

  return `${parts.join(" → ")}${rounds}${auto}。`;
}
