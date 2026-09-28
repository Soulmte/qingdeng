import { create } from "zustand";

interface DataStore {
  /** 本地记录版本号：写入或清空记录后自增，统计相关的 hook 靠它重新查询 */
  version: number;
  bump: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
