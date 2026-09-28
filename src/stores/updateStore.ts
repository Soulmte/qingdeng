import { create } from "zustand";
import { supportsAutoUpdate } from "@/lib/platform";
import { checkForUpdate, relaunchApp, type PendingUpdate, type UpdateInfo } from "@/lib/updater";
import { useSettingsStore } from "./settingsStore";

export type InstallPhase = "idle" | "downloading" | "installing" | "error";

/** 待安装的更新句柄，来自插件，不适合放进 React 状态 */
let pending: PendingUpdate | null = null;

interface UpdateStore {
  /** 当前安装的版本号，来自应用自身，拿不到时为空串 */
  currentVersion: string;
  info: UpdateInfo | null;
  open: boolean;
  phase: InstallPhase;
  /** 下载百分比，服务端没给总大小时为 null，界面退化成不确定进度 */
  percent: number | null;
  message: string | null;
  /** 「已经是最新版本」这类给手动检查看的反馈 */
  notice: string | null;
  checking: boolean;

  loadVersion: () => Promise<void>;
  /** auto 为 true 表示启动时的静默检查：已忽略的版本不再弹窗，失败也不打扰用户 */
  check: (options?: { auto?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  close: () => void;
  skipVersion: () => void;
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  currentVersion: "",
  info: null,
  open: false,
  phase: "idle",
  percent: null,
  message: null,
  notice: null,
  checking: false,

  loadVersion: async () => {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      set({ currentVersion: await getVersion() });
    } catch {
      set({ currentVersion: "" });
    }
  },

  check: async (options) => {
    const auto = options?.auto ?? false;

    if (!supportsAutoUpdate()) {
      // Android 上系统不允许应用静默覆盖安装自己，只能走下载页
      if (!auto) set({ notice: "当前平台不支持应用内更新，请前往下载页获取新版本。" });
      return;
    }

    set({ checking: true, notice: null });

    try {
      const found = await checkForUpdate();
      pending = found;

      if (!found) {
        set({ checking: false, info: null, notice: auto ? null : "已经是最新版本。" });
        return;
      }

      const skipped = useSettingsStore.getState().skippedUpdateVersion;
      set({
        checking: false,
        info: found.info,
        // 手动点「检查更新」时，即使是忽略过的版本也要让用户看到
        open: !auto || found.info.version !== skipped,
        phase: "idle",
        percent: null,
        message: null,
      });
    } catch (error) {
      set({
        checking: false,
        notice: auto
          ? null
          : `检查更新失败：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },

  install: async () => {
    if (!pending) return;

    set({ phase: "downloading", percent: null, message: null });

    try {
      await pending.install(({ downloaded, total }) => {
        set({
          phase: "downloading",
          percent: total && total > 0 ? Math.round((downloaded / total) * 100) : null,
        });
      });
      set({ phase: "installing", percent: 100 });
      // 装完必须重启，否则用户还在跑旧版本
      await relaunchApp();
    } catch (error) {
      set({ phase: "error", message: error instanceof Error ? error.message : String(error) });
    }
  },

  close: () => set({ open: false }),

  skipVersion: () => {
    const version = get().info?.version;
    if (version) useSettingsStore.getState().update({ skippedUpdateVersion: version });
    set({ open: false });
  },
}));
