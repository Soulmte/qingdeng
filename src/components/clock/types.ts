export type ClockTone = "focus" | "break";

/** md 用于计时页，lg 用于沉浸模式的全屏展示 */
export type ClockSize = "md" | "lg";

export interface ClockViewProps {
  /** 时钟显示用的毫秒数：倒计时为剩余时间，正计时为已用时间 */
  ms: number;
  /** 当前阶段完成比例，0 到 1 */
  progress: number;
  label: string;
  sublabel?: string;
  tone: ClockTone;
  countup: boolean;
  running: boolean;
  size?: ClockSize;
}
