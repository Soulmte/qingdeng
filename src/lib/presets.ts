import type { PhaseKind, TimerKind, TimerPreset } from "./types";

export const MINUTE = 60;

export const BUILTIN_PRESET_IDS = {
  classic: -1,
  deep: -2,
  studyRest: -3,
  exam: -4,
  countup: -5,
} as const;

export const BUILTIN_PRESETS: TimerPreset[] = [
  {
    id: BUILTIN_PRESET_IDS.classic,
    name: "经典番茄钟",
    summary: "25 分钟专注，5 分钟短休，4 轮后长休 15 分钟",
    kind: "countdown",
    focusSeconds: 25 * MINUTE,
    shortBreakSeconds: 5 * MINUTE,
    longBreakSeconds: 15 * MINUTE,
    roundsPerSet: 4,
    autoStartNext: false,
    isBuiltin: true,
  },
  {
    id: BUILTIN_PRESET_IDS.deep,
    name: "深度专注",
    summary: "50 分钟专注，10 分钟短休，3 轮后长休 25 分钟",
    kind: "countdown",
    focusSeconds: 50 * MINUTE,
    shortBreakSeconds: 10 * MINUTE,
    longBreakSeconds: 25 * MINUTE,
    roundsPerSet: 3,
    autoStartNext: false,
    isBuiltin: true,
  },
  {
    id: BUILTIN_PRESET_IDS.studyRest,
    name: "学习休息",
    summary: "45 分钟学习，15 分钟休息，自动接续下一段",
    kind: "countdown",
    focusSeconds: 45 * MINUTE,
    shortBreakSeconds: 15 * MINUTE,
    longBreakSeconds: 30 * MINUTE,
    roundsPerSet: 2,
    autoStartNext: true,
    isBuiltin: true,
  },
  {
    id: BUILTIN_PRESET_IDS.exam,
    name: "考试模式",
    summary: "单段倒计时，不插入休息，剩余 15 与 5 分钟时提醒",
    kind: "countdown",
    focusSeconds: 120 * MINUTE,
    shortBreakSeconds: 0,
    longBreakSeconds: 0,
    roundsPerSet: 1,
    autoStartNext: false,
    isBuiltin: true,
  },
  {
    id: BUILTIN_PRESET_IDS.countup,
    name: "正计时",
    summary: "只累计投入时间，手动结束，适合记录整段学习",
    kind: "countup",
    focusSeconds: 0,
    shortBreakSeconds: 0,
    longBreakSeconds: 0,
    roundsPerSet: 1,
    autoStartNext: false,
    isBuiltin: true,
  },
];

export const QUICK_MINUTES = [5, 10, 15, 25, 45, 60, 90];

export const PHASE_LABELS: Record<PhaseKind, string> = {
  focus: "专注",
  short_break: "短休息",
  long_break: "长休息",
};

export const PHASE_HINTS: Record<PhaseKind, string> = {
  focus: "保持专注，不要切换任务",
  short_break: "起身活动一下，让眼睛离开屏幕",
  long_break: "这段休息长一些，可以走动或补充水分",
};

export function findPreset(presets: TimerPreset[], id: number) {
  return presets.find((item) => item.id === id) ?? BUILTIN_PRESETS[0];
}

/** 内置模板固定排在前面，自定义模板按创建时间倒序跟在后面 */
export function mergePresets(custom: TimerPreset[]) {
  return [...BUILTIN_PRESETS, ...custom];
}

export function isExamPreset(preset: TimerPreset) {
  return preset.id === BUILTIN_PRESET_IDS.exam;
}

/** 自定义单次计时：时长只用于本次，不写入模板列表 */
export function createOneOffPreset(seconds: number, kind: TimerKind): TimerPreset {
  return {
    id: 0,
    name: kind === "countup" ? "自定义正计时" : "自定义倒计时",
    summary: "仅本次生效",
    kind,
    focusSeconds: kind === "countup" ? 0 : seconds,
    shortBreakSeconds: 0,
    longBreakSeconds: 0,
    roundsPerSet: 1,
    autoStartNext: false,
    isBuiltin: false,
  };
}

export function phaseDurationSeconds(preset: TimerPreset, phase: PhaseKind) {
  if (preset.kind === "countup") return 0;
  if (phase === "short_break") return preset.shortBreakSeconds;
  if (phase === "long_break") return preset.longBreakSeconds;
  return preset.focusSeconds;
}

/** 结束后该进入哪个阶段；休息时长配成 0 说明这个模式不排休息 */
export function nextPhaseOf(preset: TimerPreset, current: PhaseKind, round: number): PhaseKind {
  if (preset.kind === "countup") return "focus";
  if (current !== "focus") return "focus";
  if (preset.shortBreakSeconds <= 0 && preset.longBreakSeconds <= 0) return "focus";
  const useLong = preset.roundsPerSet > 0 && round % preset.roundsPerSet === 0;
  if (useLong && preset.longBreakSeconds > 0) return "long_break";
  if (preset.shortBreakSeconds > 0) return "short_break";
  return "long_break";
}

export function describeBreaks(preset: TimerPreset) {
  if (preset.kind === "countup") return "手动结束";
  if (preset.shortBreakSeconds <= 0 && preset.longBreakSeconds <= 0) return "不排休息";
  return `${Math.round(preset.shortBreakSeconds / MINUTE)} / ${Math.round(preset.longBreakSeconds / MINUTE)} 分钟`;
}
