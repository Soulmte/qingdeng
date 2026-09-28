/**
 * 下载页的唯一一段脚本：读最新版本，把两个下载按钮指到具体文件。
 *
 * 按钮的 href 一开始指向发布页，任何一步失败都留着这个兜底地址，
 * 所以就算 CDN 拉不到清单，页面依然可以下载。
 */
const REPO = "Soulmte/qingdeng";
const MANIFEST = `https://cdn.jsdelivr.net/gh/${REPO}@cdn/latest.json`;
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@cdn`;

async function main() {
  const windowsButton = document.getElementById("dl-windows");
  const androidButton = document.getElementById("dl-android");
  const versionLine = document.getElementById("dl-version");

  try {
    const response = await fetch(MANIFEST, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();

    const version = manifest.version;
    if (!version) throw new Error("清单里没有版本号");

    if (windowsButton) {
      windowsButton.href = `https://github.com/${REPO}/releases/download/v${version}/QingDeng_${version}_x64-setup.exe`;
    }
    if (androidButton) {
      // 安卓包也镜像到了 cdn 分支，平板多半在国内网络，走 CDN 快很多
      androidButton.href = `${CDN_BASE}/QingDeng_${version}_arm64.apk`;
    }

    const published = String(manifest.pub_date ?? "").slice(0, 10);
    if (versionLine) {
      versionLine.textContent = published
        ? `最新版本 ${version} · ${published}`
        : `最新版本 ${version}`;
    }
  } catch {
    // 拉不到就保持兜底：按钮仍然指向发布页
    if (versionLine) versionLine.textContent = "暂时读不到最新版本号，上面的按钮会带你到发布页。";
  }
}

void main();
