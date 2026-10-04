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
  /** 安装包字节数，清单没给时为 null；用来让进度条落在真实百分比上 */
  size: number | null;
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

/**
 * 从 CDN 清单里读安装包大小。
 *
 * 发布时把 size 写进 platforms 的每一项；updater 只认 url 与 signature，
 * 多出来的键会被忽略，所以这份大小不影响签名校验，只给界面算真实百分比。
 */
function readManifestSize(rawJson: unknown): number | null {
  const platforms = (rawJson as { platforms?: Record<string, { size?: unknown }> } | null)
    ?.platforms;
  if (!platforms) return null;
  for (const entry of Object.values(platforms)) {
    if (typeof entry?.size === "number" && entry.size > 0) return entry.size;
  }
  return null;
}

/** 拉取 CDN 清单并比对版本；没有新版本、平台不支持或网络不通都返回 null */
export async function checkForUpdate(): Promise<PendingUpdate | null> {
  if (!supportsAutoUpdate()) return null;

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;

  const info: UpdateInfo = {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? "",
    date: update.date ?? null,
    size: readManifestSize(update.rawJson),
  };

  return {
    info,
    install: async (onProgress) => {
      let downloaded = 0;
      // 先用清单里的大小兜底：即便 CDN 不返回 Content-Length，
      // 进度条也能一上来就是真实百分比，而不是来回跑的不确定态
      let total: number | null = info.size;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? info.size;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
        } else if (event.event === "Finished" && total !== null) {
          // 收尾对齐到总大小，避免最后一个分块没对上导致停在 99%
          downloaded = total;
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

/** 把字节数写成人能看的单位，用于下载进度与速度 */
export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 把 CDN 清单里的 notes 拆成可读的行。
 *
 * 发布说明同时要当 Release 正文用，所以带着 Markdown 结构：
 *   - `# xxx` 是整篇文档的标题，弹窗自己已经有标题了，丢掉不显示
 *   - `## xxx` 当作小节标题，去掉井号后用强调样式展示
 *   - `- xxx` 当作列表项
 */
export interface UpdateNoteLine {
  /** 列表项，前面带一个圆点 */
  bullet: boolean;
  /** 小节标题，用强调样式展示 */
  heading: boolean;
  text: string;
}

export function parseNotes(notes: string): UpdateNoteLine[] {
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // 一级标题是文档题目，和弹窗标题重复
    .filter((line) => !/^#\s+/.test(line))
    .map((line) => {
      const heading = /^#{2,6}\s+/.test(line);
      if (heading) {
        return { bullet: false, heading: true, text: line.replace(/^#{2,6}\s+/, "") };
      }
      const bullet = /^[-*·]\s+/.test(line);
      return {
        bullet,
        heading: false,
        text: bullet ? line.replace(/^[-*·]\s+/, "") : line,
      };
    });
}
