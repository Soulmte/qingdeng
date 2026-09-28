import { create } from "zustand";
import { loadSettings, saveSetting } from "@/db/client";
import { BUILTIN_PRESET_IDS } from "@/lib/presets";
import type { ClockFace } from "@/lib/types";

export interface AppSettings {
  clockFace: ClockFace;
  lastPresetId: number;
  lastTaskId: number;
  dailyGoalMinutes: number;
  soundEnabled: boolean;
  notifyEnabled: boolean;
  notifyTaskDone: boolean;
  dndEnabled: boolean;
  keepAwake: boolean;
  alwaysOnTop: boolean;
  immersiveAutoFullscreen: boolean;
  immersiveAlwaysShowClock: boolean;
  /** 阶段结束后自动接续下一段，休息与专注不用每轮重新点开始 */
  autoContinue: boolean;
  /** 用户选择「忽略此版本」时记下版本号，启动时不再为它弹窗 */
  skippedUpdateVersion: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  clockFace: "ring",
  lastPresetId: BUILTIN_PRESET_IDS.classic,
  lastTaskId: 0,
  dailyGoalMinutes: 120,
  soundEnabled: true,
  notifyEnabled: true,
  notifyTaskDone: true,
  dndEnabled: false,
  keepAwake: true,
  alwaysOnTop: false,
  immersiveAutoFullscreen: true,
  immersiveAlwaysShowClock: true,
  autoContinue: true,
  skippedUpdateVersion: "",
};

const CLOCK_FACES: ClockFace[] = ["ring", "flip", "plain"];

function toSettings(raw: Record<string, string>): AppSettings {
  const next = { ...DEFAULT_SETTINGS };

  if (CLOCK_FACES.includes(raw.clockFace as ClockFace)) {
    next.clockFace = raw.clockFace as ClockFace;
  }
  const presetId = Number(raw.lastPresetId);
  if (Number.isFinite(presetId)) next.lastPresetId = presetId;
  const taskId = Number(raw.lastTaskId);
  if (Number.isFinite(taskId)) next.lastTaskId = taskId;
  const goal = Number(raw.dailyGoalMinutes);
  if (Number.isFinite(goal) && goal > 0) next.dailyGoalMinutes = goal;
  next.soundEnabled = raw.soundEnabled !== "false";
  next.notifyEnabled = raw.notifyEnabled !== "false";
  next.notifyTaskDone = raw.notifyTaskDone !== "false";
  next.dndEnabled = raw.dndEnabled === "true";
  next.keepAwake = raw.keepAwake !== "false";
  next.alwaysOnTop = raw.alwaysOnTop === "true";
  next.immersiveAutoFullscreen = raw.immersiveAutoFullscreen !== "false";
  next.immersiveAlwaysShowClock = raw.immersiveAlwaysShowClock !== "false";
  next.autoContinue = raw.autoContinue !== "false";
  if (raw.skippedUpdateVersion) next.skippedUpdateVersion = raw.skippedUpdateVersion;

  return next;
}

interface SettingsStore extends AppSettings {
  ready: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  ready: false,
  error: null,

  hydrate: async () => {
    try {
      const raw = await loadSettings();
      set({ ...toSettings(raw), ready: true, error: null });
    } catch (error) {
      set({ ready: true, error: error instanceof Error ? error.message : String(error) });
    }
  },

  update: (patch) => {
    set(patch);
    Object.entries(patch).forEach(([key, value]) => {
      saveSetting(key, String(value)).catch((error) => {
        set({ error: error instanceof Error ? error.message : String(error) });
      });
    });
  },
}));
