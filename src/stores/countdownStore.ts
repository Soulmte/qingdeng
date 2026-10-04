import { create } from "zustand";
import {
  deleteCountdown as deleteCountdownRow,
  insertCountdown,
  listCountdowns,
  updateCountdown as updateCountdownRow,
} from "@/db/client";
import type { CountdownDraft, CountdownRecord } from "@/lib/types";

interface CountdownStore {
  countdowns: CountdownRecord[];
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CountdownDraft) => Promise<void>;
  update: (id: number, draft: CountdownDraft) => Promise<void>;
  remove: (id: number) => Promise<void>;
  /** 只切换「是否在沉浸界面展示」，不必走一遍编辑弹窗 */
  setShowInImmersive: (id: number, showInImmersive: boolean) => Promise<void>;
}

export const useCountdownStore = create<CountdownStore>((set, get) => ({
  countdowns: [],
  ready: false,
  error: null,

  refresh: async () => {
    try {
      set({ countdowns: await listCountdowns(), ready: true, error: null });
    } catch (error) {
      set({ ready: true, error: error instanceof Error ? error.message : String(error) });
    }
  },

  create: async (draft) => {
    await insertCountdown(draft);
    await get().refresh();
  },

  update: async (id, draft) => {
    await updateCountdownRow(id, draft);
    await get().refresh();
  },

  remove: async (id) => {
    await deleteCountdownRow(id);
    await get().refresh();
  },

  setShowInImmersive: async (id, showInImmersive) => {
    const current = get().countdowns.find((item) => item.id === id);
    if (!current) return;
    await updateCountdownRow(id, {
      title: current.title,
      targetAt: current.targetAt,
      showInImmersive,
    });
    await get().refresh();
  },
}));
