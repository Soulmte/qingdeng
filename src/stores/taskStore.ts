import { create } from "zustand";
import {
  countRoundsByTask,
  deleteTask as deleteTaskRow,
  insertTask,
  listTasks,
  setTaskStatus,
  updateTaskContent,
} from "@/db/client";
import type { TaskRecord } from "@/lib/types";
import { useDataStore } from "./dataStore";

interface TaskDraft {
  title: string;
  note: string;
  estimateRounds: number;
}

interface TaskStore {
  tasks: TaskRecord[];
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: TaskDraft) => Promise<void>;
  rename: (id: number, draft: TaskDraft) => Promise<void>;
  setStatus: (id: number, done: boolean) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  ready: false,
  error: null,

  refresh: async () => {
    try {
      const [tasks, rounds] = await Promise.all([listTasks(), countRoundsByTask()]);
      set({
        tasks: tasks.map((task) => ({ ...task, doneRounds: rounds[task.id] ?? 0 })),
        ready: true,
        error: null,
      });
    } catch (error) {
      set({ ready: true, error: error instanceof Error ? error.message : String(error) });
    }
  },

  create: async (draft) => {
    await insertTask(draft);
    await get().refresh();
    useDataStore.getState().bump();
  },

  rename: async (id, draft) => {
    await updateTaskContent(id, draft);
    await get().refresh();
  },

  setStatus: async (id, done) => {
    await setTaskStatus(id, done);
    await get().refresh();
  },

  remove: async (id) => {
    await deleteTaskRow(id);
    await get().refresh();
  },
}));
