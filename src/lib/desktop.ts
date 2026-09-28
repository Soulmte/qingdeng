import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import {
  supportsFocusAssist,
  supportsKeepAwake,
  supportsWindowControls,
} from "@/lib/platform";

/** 桌面窗口能力在 Android 上不存在，调用前先判断，避免抛错影响业务逻辑 */

export async function applyFullscreen(enabled: boolean) {
  if (!supportsWindowControls()) return;
  await getCurrentWindow().setFullscreen(enabled);
}

export async function applyAlwaysOnTop(enabled: boolean) {
  if (!supportsWindowControls()) return;
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

export async function isFullscreen() {
  if (!supportsWindowControls()) return false;
  return getCurrentWindow().isFullscreen();
}

export async function applyKeepAwake(enabled: boolean) {
  if (!supportsKeepAwake()) return;
  await invoke("set_keep_awake", { enabled });
}

/** Windows 11 专注助手：开启后系统会静音其他应用的通知 */
export async function applyFocusAssist(enabled: boolean) {
  if (!supportsFocusAssist()) return;
  await invoke("set_focus_assist", { enabled });
}

/** 打开系统设置页，应用无法自己修改系统级的免打扰名单 */
export async function openSystemSettings(page: "notifications" | "quiethours") {
  if (!supportsFocusAssist()) return;
  await invoke("open_system_settings", { page });
}
