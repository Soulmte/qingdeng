import { create } from "zustand";
import { createPreset, deletePreset, listCustomPresets, updatePreset } from "@/db/client";
import type { PresetDraft, TimerPreset } from "@/lib/types";

export type { PresetDraft };

interface PresetStore {
  custom: TimerPreset[];
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: PresetDraft) => Promise<void>;
  update: (id: number, draft: PresetDraft) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  custom: [],
  ready: false,
  error: null,

  refresh: async () => {
    try {
      set({ custom: await listCustomPresets(), ready: true, error: null });
    } catch (error) {
      set({ ready: true, error: error instanceof Error ? error.message : String(error) });
    }
  },

  create: async (draft) => {
    await createPreset(draft);
    await get().refresh();
  },

  update: async (id, draft) => {
    await updatePreset(id, draft);
    await get().refresh();
  },

  remove: async (id) => {
    await deletePreset(id);
    await get().refresh();
  },
}));
