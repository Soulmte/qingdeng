import { useEffect } from "react";
import { applyAlwaysOnTop, applyFocusAssist, applyKeepAwake } from "@/lib/desktop";
import { PHASE_LABELS, phaseDurationSeconds } from "@/lib/presets";
import { formatClock } from "@/lib/time";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";

/**
 * 把计时状态同步到桌面窗口：任务栏标题、窗口置顶、以及运行期间阻止屏幕休眠。
 */
export function useDesktopSync() {
  const status = useTimerStore((state) => state.status);
  const preset = useTimerStore((state) => state.preset);
  const phase = useTimerStore((state) => state.phase);
  const elapsedMs = useTimerStore((state) => state.elapsedMs);
  const keepAwake = useSettingsStore((state) => state.keepAwake);
  const alwaysOnTop = useSettingsStore((state) => state.alwaysOnTop);
  const dndEnabled = useSettingsStore((state) => state.dndEnabled);

  const running = status === "running";
  const totalMs = phaseDurationSeconds(preset, phase) * 1000;
  const displayMs = preset.kind === "countup" ? elapsedMs : Math.max(0, totalMs - elapsedMs);

  useEffect(() => {
    document.title = running
      ? `${formatClock(displayMs)} · ${PHASE_LABELS[phase]} · 青灯`
      : "青灯";
  }, [running, displayMs, phase]);

  useEffect(() => {
    void applyKeepAwake(keepAwake && running).catch(() => undefined);
  }, [keepAwake, running]);

  useEffect(() => {
    void applyAlwaysOnTop(alwaysOnTop).catch(() => undefined);
  }, [alwaysOnTop]);

  // 系统免打扰只在真正跑着计时的时候开，暂停或结束就交还控制权
  useEffect(() => {
    void applyFocusAssist(dndEnabled && running).catch(() => undefined);
  }, [dndEnabled, running]);

  useEffect(() => {
    return () => {
      void applyKeepAwake(false).catch(() => undefined);
    };
  }, []);
}
