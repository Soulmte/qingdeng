import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * 对用户有意义的几个外部地址。
 * 下载新版本、反馈问题都在项目主页，所以统一放这里，避免各处硬编码。
 */
export const PROJECT_URL = "https://github.com/Soulmte/qingdeng";
export const RELEASES_URL = `${PROJECT_URL}/releases/latest`;
export const ISSUES_URL = `${PROJECT_URL}/issues`;

/** 用系统默认浏览器打开链接；没有浏览器或被系统拦截时静默放弃，不打断使用 */
export async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // 打不开就算了，不需要为此弹一个错误
  }
}
