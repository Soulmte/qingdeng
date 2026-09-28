import { create } from "zustand";
import { insertSession } from "@/db/client";
import {
  BUILTIN_PRESETS,
  createOneOffPreset,
  nextPhaseOf,
  phaseDurationSeconds,
  PHASE_LABELS,
} from "@/lib/presets";
import { notifyPhaseEnd } from "@/lib/notify";
import { playPhaseChime } from "@/lib/sound";
import type { PhaseKind, TimerKind, TimerPreset, TimerStatus } from "@/lib/types";
import { useDataStore } from "./dataStore";
import { useSettingsStore } from "./settingsStore";
import { useTaskStore } from "./taskStore";

/** 中断的片段短于这个时长就不入库，避免统计被误触污染 */
const MIN_RECORDED_SECONDS = 30;
/**
 * 手动按「结束本段」时放宽的最低记录时长。
 * 这是用户看着秒数按下去的明确动作，计入的应该是真实用时，
 * 门槛压低只是为了不让手滑产生的零点几秒也写进统计。
 */
const MIN_MANUAL_SECONDS = 10;
const TICK_INTERVAL_MS = 200;

let ticker: number | null = null;

function startTicker() {
  if (ticker !== null) return;
  ticker = window.setInterval(() => useTimerStore.getState().tick(), TICK_INTERVAL_MS);
}

function stopTicker() {
  if (ticker === null) return;
  window.clearInterval(ticker);
  ticker = null;
}

interface TimerStore {
  preset: TimerPreset;
  phase: PhaseKind;
  round: number;
  status: TimerStatus;
  elapsedMs: number;
  startedAtMs: number | null;
  sessionStartedAtMs: number | null;
  taskId: number | null;
  taskName: string;
  error: string | null;

  selectPreset: (preset: TimerPreset) => void;
  startOneOff: (seconds: number, kind: TimerKind) => void;
  setTask: (task: { id: number; title: string } | null) => void;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  /** 结束本段：把已用时间计入统计，并按模板接续下一段 */
  endPhase: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
}

/** 专注段刚好补满预估段数时提醒一次，之后的超额段不再重复打扰 */
async function notifyTaskReached(taskId: number | null, phase: PhaseKind, completed: boolean) {
  if (taskId === null || !completed || phase !== "focus") return;
  if (!useSettingsStore.getState().notifyTaskDone) return;

  const taskStore = useTaskStore.getState();
  await taskStore.refresh();

  const task = taskStore.tasks.find((item) => item.id === taskId);
  if (!task || task.status !== "open" || task.doneRounds !== task.estimateRounds) return;

  void notifyPhaseEnd(
    "任务已达成预估段数",
    `「${task.title}」完成 ${task.doneRounds} / ${task.estimateRounds} 段，可以收尾了。`,
  );
}

async function record(
  preset: TimerPreset,
  phase: PhaseKind,
  planSeconds: number,
  actualSeconds: number,
  completed: boolean,
  taskId: number | null,
  task: string,
  startedAtMs: number | null,
) {
  const endedAt = new Date();
  const startedAt = new Date(startedAtMs ?? endedAt.getTime() - actualSeconds * 1000);

  try {
    await insertSession({
      presetId: preset.id,
      presetName: preset.name,
      phase,
      planSeconds,
      actualSeconds,
      completed,
      taskId,
      task,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    });
    useDataStore.getState().bump();
    await notifyTaskReached(taskId, phase, completed);
  } catch (error) {
    useTimerStore.setState({ error: error instanceof Error ? error.message : String(error) });
  }
}

export const useTimerStore = create<TimerStore>((set, get) => {
  /**
   * 结束当前阶段。
   * - `completed`：这一段是否完整跑完，决定 `sessions.completed`（完成段数统计）
   * - `manual`：用户主动按「结束本段」，按实际用时计入并照常接续下一段
   * - 两者都为 false（跳过）：不计入并把控制权交回，等用户手动开始
   */
  const finishPhase = ({ completed, manual = false }: { completed: boolean; manual?: boolean }) => {
    const state = get();
    const settings = useSettingsStore.getState();
    const planSeconds = Math.round(phaseDurationSeconds(state.preset, state.phase));
    const actualSeconds = Math.round(state.elapsedMs / 1000);
    const keepsRecord = completed || actualSeconds >= (manual ? MIN_MANUAL_SECONDS : MIN_RECORDED_SECONDS);

    // 手动结束也意味着「这一段到此为止」，提示与自动接续都照常走
    const movesOn = completed || manual;
    const autoStart = settings.autoContinue || state.preset.autoStartNext;

    if (keepsRecord && actualSeconds > 0) {
      void record(
        state.preset,
        state.phase,
        planSeconds,
        Math.min(actualSeconds, planSeconds || actualSeconds),
        completed,
        state.taskId,
        state.taskName,
        state.sessionStartedAtMs,
      );
    }

    if (movesOn && settings.soundEnabled) {
      playPhaseChime(state.phase === "focus" ? "focus_end" : "break_end");
    }

    const hasBreaks = state.preset.shortBreakSeconds > 0 || state.preset.longBreakSeconds > 0;

    // 不排休息的模板：按设定的段数连续做，最后一段跑完才结束
    if (!hasBreaks) {
      const totalRounds = Math.max(1, state.preset.roundsPerSet);
      const moreRounds = state.preset.kind === "countdown" && state.round < totalRounds;

      if (moreRounds) {
        set({
          phase: "focus",
          round: state.round + 1,
          elapsedMs: 0,
          startedAtMs: null,
          sessionStartedAtMs: null,
          status: "idle",
        });

        if (movesOn && settings.notifyEnabled) {
          void notifyPhaseEnd(
            `第 ${state.round} 段结束`,
            `共 ${totalRounds} 段，可以开始第 ${state.round + 1} 段。`,
          );
        }

        if (movesOn && autoStart) get().start();
        else stopTicker();
        return;
      }

      stopTicker();
      set({
        status: "finished",
        phase: "focus",
        elapsedMs: state.elapsedMs,
        startedAtMs: null,
        sessionStartedAtMs: null,
      });

      if (movesOn && settings.notifyEnabled) {
        void notifyPhaseEnd("本段计时结束", `「${state.preset.name}」已经完成。`);
      }
      return;
    }

    const nextPhase = nextPhaseOf(state.preset, state.phase, state.round);
    const nextRound = state.phase === "focus" ? state.round : state.round + 1;

    set({
      phase: nextPhase,
      round: nextRound,
      elapsedMs: 0,
      startedAtMs: null,
      sessionStartedAtMs: null,
      status: "idle",
    });

    if (movesOn && settings.notifyEnabled) {
      const nextMinutes = Math.round(phaseDurationSeconds(state.preset, nextPhase) / 60);
      void notifyPhaseEnd(
        state.phase === "focus" ? "专注结束" : "休息结束",
        state.phase === "focus"
          ? `接下来是${PHASE_LABELS[nextPhase]}，${nextMinutes} 分钟。`
          : "回到专注吧，下一段马上开始。",
      );
    }

    if (movesOn && autoStart) {
      get().start();
    } else {
      stopTicker();
    }
  };

  return {
    preset: BUILTIN_PRESETS[0],
    phase: "focus",
    round: 1,
    status: "idle",
    elapsedMs: 0,
    startedAtMs: null,
    sessionStartedAtMs: null,
    taskId: null,
    taskName: "",
    error: null,

    selectPreset: (preset) => {
      if (get().status === "running" || get().status === "paused") return;
      stopTicker();
      set({
        preset,
        phase: "focus",
        round: 1,
        status: "idle",
        elapsedMs: 0,
        startedAtMs: null,
        sessionStartedAtMs: null,
      });
    },

    startOneOff: (seconds, kind) => {
      const preset = createOneOffPreset(seconds, kind);
      stopTicker();
      set({
        preset,
        phase: "focus",
        round: 1,
        status: "idle",
        elapsedMs: 0,
        startedAtMs: null,
        sessionStartedAtMs: null,
      });
      get().start();
    },

    setTask: (task) => {
      set({ taskId: task?.id ?? null, taskName: task?.title ?? "" });
      useSettingsStore.getState().update({ lastTaskId: task?.id ?? 0 });
    },

    start: () => {
      const state = get();
      if (state.status === "running") return;
      const fromStart = state.status === "finished" ? 0 : state.elapsedMs;
      set({
        status: "running",
        elapsedMs: fromStart,
        startedAtMs: Date.now() - fromStart,
        sessionStartedAtMs: state.sessionStartedAtMs ?? Date.now(),
      });
      startTicker();
    },

    pause: () => {
      if (get().status !== "running") return;
      stopTicker();
      set({ status: "paused", startedAtMs: null });
    },

    toggle: () => {
      const status = get().status;
      if (status === "running") get().pause();
      else get().start();
    },

    reset: () => {
      const state = get();
      const actualSeconds = Math.round(state.elapsedMs / 1000);
      if (state.status !== "idle" && actualSeconds >= MIN_RECORDED_SECONDS) {
        void record(
          state.preset,
          state.phase,
          Math.round(phaseDurationSeconds(state.preset, state.phase)),
          actualSeconds,
          false,
          state.taskId,
          state.taskName,
          state.sessionStartedAtMs,
        );
      }
      stopTicker();
      set({
        status: "idle",
        elapsedMs: 0,
        startedAtMs: null,
        sessionStartedAtMs: null,
      });
    },

    endPhase: () => {
      const state = get();
      // 还没开始过就没有可计入的时间
      if (state.status === "idle" && state.elapsedMs === 0) return;
      finishPhase({ completed: false, manual: true });
    },

    skip: () => {
      finishPhase({ completed: false });
    },

    tick: () => {
      const state = get();
      if (state.status !== "running" || state.startedAtMs === null) return;

      const elapsed = Date.now() - state.startedAtMs;
      const totalMs = phaseDurationSeconds(state.preset, state.phase) * 1000;

      if (state.preset.kind === "countdown" && elapsed >= totalMs) {
        set({ elapsedMs: totalMs });
        finishPhase({ completed: true });
        return;
      }

      set({ elapsedMs: elapsed });
    },
  };
});

export function selectRemainingMs(state: Pick<TimerStore, "preset" | "phase" | "elapsedMs">) {
  if (state.preset.kind === "countup") return 0;
  return Math.max(0, phaseDurationSeconds(state.preset, state.phase) * 1000 - state.elapsedMs);
}

export function selectProgress(state: Pick<TimerStore, "preset" | "phase" | "elapsedMs">) {
  const totalMs = phaseDurationSeconds(state.preset, state.phase) * 1000;
  if (totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, state.elapsedMs / totalMs));
}

export function selectDisplayMs(state: Pick<TimerStore, "preset" | "phase" | "elapsedMs">) {
  return state.preset.kind === "countup" ? state.elapsedMs : selectRemainingMs(state);
}
