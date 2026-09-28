import { isDesktopRuntime } from "@/db/client";

/**
 * 平台能力判断。
 * 同一份代码要同时跑在桌面（Windows）和 Android 平板上，
 * 差别集中在「窗口控制」「系统免打扰」「在资源管理器里定位文件」这几处，
 * 统一在这里判断，组件与 hooks 只问这里。
 */

export function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function isWindows() {
  return typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);
}

/** 触摸为主（平板、手机），用于调整触控尺寸 */
export function isTouchPrimary() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * 是否用触屏版布局。
 *
 * 除了「主指针是不是粗的」，还把安卓整体算进来：
 * 平板上接了鼠标、或者用 S Pen 时，`pointer` 会变成 fine，
 * 但那种场景下用户面对的仍然是一块需要手指点的屏幕，不该出现 224px 的桌面侧边栏。
 */
export function usesTouchLayout() {
  return isAndroid() || isTouchPrimary();
}

/**
 * 把布局标记挂到 <html> 上，CSS 靠它决定导航形态。
 * 必须在首屏渲染前调用，否则会先闪一下桌面侧边栏。
 */
export function applyLayoutClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("touch-ui", usesTouchLayout());
}

/** 全屏、窗口置顶这类桌面窗口能力 */
export function supportsWindowControls() {
  return isDesktopRuntime() && !isAndroid();
}

/** Windows 11 专注助手 */
export function supportsFocusAssist() {
  return isDesktopRuntime() && isWindows();
}

/** 阻止屏幕休眠：桌面由 keepawake 实现，移动端交给系统 */
export function supportsKeepAwake() {
  return isDesktopRuntime() && !isAndroid();
}

/** 在文件管理器里定位导出文件 */
export function supportsRevealInFolder() {
  return supportsWindowControls();
}

/**
 * 应用内自动更新：Tauri updater 只有 Windows / macOS / Linux 实现。
 * Android 上系统不允许应用静默覆盖安装自己，只能下载 APK 让用户确认。
 */
export function supportsAutoUpdate() {
  return isDesktopRuntime() && !isAndroid();
}
