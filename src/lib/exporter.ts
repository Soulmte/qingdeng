import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { dumpAll, isDesktopRuntime } from "@/db/client";
import { supportsRevealInFolder } from "./platform";
import { PHASE_LABELS } from "./presets";
import { toDateKey } from "./time";
import type { SessionRecord } from "./types";

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function sessionsToCsv(sessions: SessionRecord[]) {
  const header = [
    "日期",
    "结束时间",
    "模板",
    "阶段",
    "任务",
    "计划秒数",
    "实际秒数",
    "是否完成",
  ];

  const rows = sessions.map((session) => [
    toDateKey(new Date(session.endedAt)),
    session.endedAt,
    session.presetName,
    PHASE_LABELS[session.phase],
    session.task,
    session.planSeconds,
    session.actualSeconds,
    session.completed === 1 ? "已完成" : "已中断",
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

async function save(fileName: string, contents: string) {
  const path = await invoke<string>("save_export", { fileName, contents });
  // 移动端没有「在文件夹中显示」，只把路径回给界面
  if (supportsRevealInFolder()) {
    await revealItemInDir(path);
  }
  return path;
}

/** 导出完整备份：计时记录、任务、自定义模板、偏好设置 */
export async function exportBackup() {
  if (!isDesktopRuntime()) throw new Error("导出功能仅在桌面应用内可用");
  const data = await dumpAll();
  const payload = {
    app: "青灯",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return save(`qingdeng-backup-${timestamp()}.json`, JSON.stringify(payload, null, 2));
}

/** 导出记录表：给 Excel 或论文插图用 */
export async function exportSessionsCsv() {
  if (!isDesktopRuntime()) throw new Error("导出功能仅在桌面应用内可用");
  const { sessions } = await dumpAll();
  // 带 BOM，Excel 打开中文不会乱码
  return save(`qingdeng-sessions-${timestamp()}.csv`, `\uFEFF${sessionsToCsv(sessions)}`);
}
