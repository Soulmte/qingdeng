import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ImmersiveView } from "@/components/ImmersiveView";
import { UpdateDialog } from "@/components/UpdateDialog";
import { AppShell } from "@/components/layout/AppShell";
import { useDesktopSync } from "@/hooks/useDesktopSync";
import { useTimerHotkeys } from "@/hooks/useTimerHotkeys";
import { findPreset, mergePresets } from "@/lib/presets";
import { useCountdownStore } from "@/stores/countdownStore";
import { usePresetStore } from "@/stores/presetStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTaskStore } from "@/stores/taskStore";
import { useTimerStore } from "@/stores/timerStore";
import { useUpdateStore } from "@/stores/updateStore";
import CountdownsPage from "@/views/CountdownsPage";
import ModesPage from "@/views/ModesPage";
import SettingsPage from "@/views/SettingsPage";
import StatsPage from "@/views/StatsPage";
import TasksPage from "@/views/TasksPage";
import TimerPage from "@/views/TimerPage";

export default function App() {
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const refreshPresets = usePresetStore((state) => state.refresh);
  const refreshTasks = useTaskStore((state) => state.refresh);
  const refreshCountdowns = useCountdownStore((state) => state.refresh);
  const settingsReady = useSettingsStore((state) => state.ready);
  const presetsReady = usePresetStore((state) => state.ready);
  const tasksReady = useTaskStore((state) => state.ready);
  const loadVersion = useUpdateStore((state) => state.loadVersion);
  const checkUpdate = useUpdateStore((state) => state.check);

  useDesktopSync();
  useTimerHotkeys();

  useEffect(() => {
    void hydrateSettings();
    void refreshPresets();
    void refreshTasks();
    void refreshCountdowns();
    void loadVersion();
  }, [hydrateSettings, refreshPresets, refreshTasks, refreshCountdowns, loadVersion]);

  // 设置读完之后再查更新，这样才知道用户忽略过哪个版本；失败不打扰用户
  useEffect(() => {
    if (!settingsReady) return;
    void checkUpdate({ auto: true });
  }, [settingsReady, checkUpdate]);

  // 设置、模板、任务都读回来之后再恢复上次的选择，
  // 避免自定义模板还没加载就被覆盖、或关联到一个已经删掉的任务
  useEffect(() => {
    if (!settingsReady || !presetsReady || !tasksReady) return;

    const { lastPresetId, lastTaskId } = useSettingsStore.getState();
    const presets = mergePresets(usePresetStore.getState().custom);
    useTimerStore.getState().selectPreset(findPreset(presets, lastPresetId));

    const task = useTaskStore
      .getState()
      .tasks.find((item) => item.id === lastTaskId && item.status === "open");
    if (task) useTimerStore.getState().setTask({ id: task.id, title: task.title });
  }, [settingsReady, presetsReady, tasksReady]);

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<TimerPage />} />
          <Route path="/countdowns" element={<CountdownsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/modes" element={<ModesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ImmersiveView />
      <UpdateDialog />
    </>
  );
}
