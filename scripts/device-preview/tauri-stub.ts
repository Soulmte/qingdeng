/**
 * 设备探针用的 Tauri 桩：把所有插件调用换成内存实现，其中 SQL 由一个假数据库顶上，
 * 返回 .devices/seed.ts 里的演示数据，于是各页面能带着真实结构的数据渲染出来。
 * 仅在本地截图核对时使用，不参与打包。
 */
import { SEED_SETTINGS, SEED_TASKS, seedSessions } from "./seed";

const sessions = seedSessions();
const tasks = SEED_TASKS;
const settings = SEED_SETTINGS;

const select = async (sql: string, params?: unknown[]) => {
  const text = String(sql).replace(/\s+/g, " ");

  if (text.includes("FROM sessions") && text.includes("COUNT(*)")) {
    return [{ total: sessions.length }];
  }
  if (text.includes("FROM sessions") && text.includes("GROUP BY task_id")) {
    const grouped = new Map<number, number>();
    for (const row of sessions) {
      if (row.task_id === null || row.phase !== "focus" || row.completed !== 1) continue;
      grouped.set(row.task_id, (grouped.get(row.task_id) ?? 0) + 1);
    }
    return [...grouped].map(([task_id, rounds]) => ({ task_id, rounds }));
  }
  if (text.includes("FROM sessions")) {
    const since = typeof params?.[0] === "string" ? params[0] : "";
    return sessions
      .filter((row) => row.ended_at >= since)
      .sort((a, b) => (a.ended_at < b.ended_at ? 1 : -1));
  }
  if (text.includes("FROM tasks")) {
    return [...tasks].sort((a, b) =>
      a.status === b.status ? b.id - a.id : a.status === "open" ? -1 : 1,
    );
  }
  if (text.includes("FROM presets")) {
    return [];
  }
  if (text.includes("FROM settings")) {
    return Object.entries(settings).map(([key, value]) => ({ key, value }));
  }
  return [];
};

const execute = async () => undefined;

export default { load: async () => ({ execute, select }) };

export const invoke = async () => undefined;
export const openUrl = async () => undefined;
export const revealItemInDir = async () => undefined;
export const relaunch = async () => undefined;
export const check = async () => null;

export const getVersion = async () => "0.2.1";

export const isPermissionGranted = async () => true;
export const requestPermission = async () => "granted" as const;
export const sendNotification = () => undefined;

const windowStub = {
  setFullscreen: async () => undefined,
  isFullscreen: async () => false,
  setAlwaysOnTop: async () => undefined,
  isAlwaysOnTop: async () => false,
  onMoved: async () => () => undefined,
  setDecorations: async () => undefined,
};
export const getCurrentWindow = () => windowStub;

export class Resource {
  constructor(readonly rid: number) {}
  async close() {}
}
export class Channel<T = unknown> {
  readonly id = 0;
  onmessage?: (message: T) => void;
}
export const transformCallback = () => 0;
