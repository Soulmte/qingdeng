import { create } from "zustand";
import { applyFullscreen } from "@/lib/desktop";
import { useSettingsStore } from "./settingsStore";

interface ImmersiveStore {
  active: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

/** 沉浸模式的状态放在全局，方便侧边栏、快捷键、计时页共用 */
export const useImmersiveStore = create<ImmersiveStore>((set, get) => ({
  active: false,

  enter: () => {
    if (get().active) return;
    set({ active: true });
    if (useSettingsStore.getState().immersiveAutoFullscreen) {
      void applyFullscreen(true).catch(() => set({ active: false }));
    }
  },

  exit: () => {
    if (!get().active) return;
    set({ active: false });
    void applyFullscreen(false).catch(() => undefined);
  },

  toggle: () => {
    if (get().active) get().exit();
    else get().enter();
  },
}));
