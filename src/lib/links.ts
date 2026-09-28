import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * 对用户有意义的几个外部地址。
 * 下载、反馈都在项目主页，所以统一放这里，避免各处硬编码。
 */
export const PROJECT_URL = "https://github.com/Soulmte/qingdeng";
export const RELEASES_URL = `${PROJECT_URL}/releases/latest`;
export const ISSUES_URL = `${PROJECT_URL}/issues`;

/**
 * 下载页。用 GitHub Pages 发布 site/ 目录，里面会自动读最新版号并给出直链，
 * 比让人在 Release 列表里找文件清楚得多，安卓用户尤其需要。
 */
export const DOWNLOAD_URL = "https://soulmte.github.io/qingdeng/";

/** 用系统默认浏览器打开链接；没有浏览器或被系统拦截时静默放弃，不打断使用 */
export async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // 打不开就算了，不需要为此弹一个错误
  }
}
