import { supportsAutoUpdate } from "./platform";

/**
 * 应用内更新。
 *
 * 更新源是一份放在 CDN 上的清单（latest.json），由 tauri-plugin-updater 拉取：
 *   { "version": "0.2.0", "notes": "更新内容", "pubkey": "...", "platforms": { ... } }
 * 清单与安装包都用发布私钥签名，客户端只认配置里的公钥，
 * 所以 CDN 被替换也无法塞进一个未签名的包。
 *
 * 清单结构与发布流程见 docs/update-cdn.md。
 */

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  /** CDN 清单里的 notes，即更新内容 */
  notes: string;
  /** 发布日期，清单没给时为 null */
  date: string | null;
}

export type DownloadProgress = {
  /** 已下载字节数 */
  downloaded: number;
  /** 总字节数，服务端没给 Content-Length 时为 null */
  total: number | null;
};

export interface PendingUpdate {
  info: UpdateInfo;
  /** 下载并安装，安装完成后需要调用 relaunchApp 重启到新版本 */
  install: (onProgress?: (progress: DownloadProgress) => void) => Promise<void>;
}

/** 拉取 CDN 清单并比对版本；没有新版本、平台不支持或网络不通都返回 null */
export async function checkForUpdate(): Promise<PendingUpdate | null> {
  if (!supportsAutoUpdate()) return null;

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;

  return {
    info: {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body ?? "",
      date: update.date ?? null,
    },
    install: async (onProgress) => {
      let downloaded = 0;
      let total: number | null = null;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
        }
        onProgress?.({ downloaded, total });
      });
    },
  };
}

/** 安装完成后重启应用，否则用户还在跑旧版本 */
export async function relaunchApp() {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

/** 把 CDN 清单里的 notes 拆成可读的行，支持 "- " 开头的列表项 */
export function parseNotes(notes: string) {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const bullet = /^[-*·]\s+/.test(line);
      return { bullet, text: bullet ? line.replace(/^[-*·]\s+/, "") : line };
    });
}
