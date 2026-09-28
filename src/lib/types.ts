export type TimerKind = "countdown" | "countup";

export type PhaseKind = "focus" | "short_break" | "long_break";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type ClockFace = "ring" | "flip" | "plain";

export interface TimerPreset {
  /** 内置模板用固定负数 id，自定义模板用数据库自增 id */
  id: number;
  name: string;
  summary: string;
  kind: TimerKind;
  focusSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
  /** 每完成几轮专注进入长休息 */
  roundsPerSet: number;
  autoStartNext: boolean;
  isBuiltin: boolean;
}

/** 新建 / 编辑模板时提交给数据库的字段 */
export type PresetDraft = Pick<
  TimerPreset,
  | "name"
  | "kind"
  | "focusSeconds"
  | "shortBreakSeconds"
  | "longBreakSeconds"
  | "roundsPerSet"
  | "autoStartNext"
>;

export interface SessionRecord {
  id: number;
  presetId: number;
  presetName: string;
  phase: PhaseKind;
  planSeconds: number;
  actualSeconds: number;
  completed: number;
  /** 关联的任务 id，未关联任务时为 null */
  taskId: number | null;
  /** 入简留存的任务名，即使任务被删除也能回溯 */
  task: string;
  startedAt: string;
  endedAt: string;
}

export type TaskStatus = "open" | "done";

export interface TaskRecord {
  id: number;
  title: string;
  note: string;
  /** 预估需要几段专注 */
  estimateRounds: number;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  /** 已完成的专注段数，由 sessions 聚合得出 */
  doneRounds: number;
}
