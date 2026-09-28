import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { isDesktopRuntime } from "@/db/client";

/**
 * 阶段结束时发系统通知。
 * 只有应用不在前台时才发，避免用户正看着界面时被重复提醒。
 */
export async function notifyPhaseEnd(title: string, body: string) {
  if (!isDesktopRuntime()) return;
  if (document.hasFocus() && !document.hidden) return;

  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (!granted) return;
    sendNotification({ title, body });
  } catch {
    // 通知被系统禁用时静默降级，计时本身不受影响
  }
}
