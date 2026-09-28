/**
 * 下载页的唯一一段脚本：读最新版本，把下载按钮指到具体文件，并把更新说明排出来。
 *
 * 按钮的 href 一开始指向发布页，任何一步失败都留着这个兜底地址，
 * 所以就算 CDN 拉不到清单，页面依然可以下载。
 */
const REPO = "Soulmte/qingdeng";
const MANIFEST = `https://cdn.jsdelivr.net/gh/${REPO}@cdn/latest.json`;
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@cdn`;

/**
 * 更新说明是 Markdown：一级标题是文档题目（页面自己已经有标题）所以丢掉，
 * 二级标题当小节，`- ` 开头当条目，其余当正文。
 */
function parseNotes(markdown) {
  const blocks = [];
  let list = null;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#\s+/.test(line)) continue;

    const heading = /^#{2,6}\s+/.exec(line);
    if (heading) {
      list = null;
      blocks.push({ kind: "heading", text: line.replace(/^#{2,6}\s+/, "") });
      continue;
    }

    const bullet = /^[-*·]\s+/.exec(line);
    if (bullet) {
      if (!list) {
        list = { kind: "list", items: [] };
        blocks.push(list);
      }
      list.items.push(line.replace(/^[-*·]\s+/, ""));
      continue;
    }

    list = null;
    blocks.push({ kind: "text", text: line });
  }

  return blocks;
}

function renderNotes(container, markdown) {
  container.replaceChildren();

  for (const block of parseNotes(markdown)) {
    if (block.kind === "heading") {
      const heading = document.createElement("h3");
      heading.textContent = block.text;
      container.append(heading);
      continue;
    }

    if (block.kind === "list") {
      const list = document.createElement("ul");
      for (const item of block.items) {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
      }
      container.append(list);
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = block.text;
    container.append(paragraph);
  }
}

async function main() {
  const windowsButton = document.getElementById("dl-windows");
  const androidButton = document.getElementById("dl-android");
  const versionLine = document.getElementById("dl-version");
  const releaseVersion = document.getElementById("release-version");
  const releaseNotes = document.getElementById("release-notes");

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
      androidButton.href = `${CDN_BASE}/QingDeng_${version}_arm64.apk`;
    }

    const published = String(manifest.pub_date ?? "").slice(0, 10);
    if (versionLine) {
      versionLine.textContent = published
        ? `最新版本 ${version}，发布于 ${published}。`
        : `最新版本 ${version}。`;
    }

    if (releaseVersion) {
      releaseVersion.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = `v${version}`;
      releaseVersion.append(strong);
      if (published) releaseVersion.append(` · ${published}`);
    }

    if (releaseNotes && typeof manifest.notes === "string") {
      renderNotes(releaseNotes, manifest.notes);
    } else if (releaseNotes) {
      releaseNotes.textContent = "这一版没有附更新说明。";
    }
  } catch {
    // 拉不到就保持兜底：按钮仍然指向发布页
    if (versionLine) versionLine.textContent = "暂时读不到最新版本号，点上面的按钮会到发布页。";
    if (releaseVersion) releaseVersion.textContent = "暂时读不到更新记录，可以到发布页查看。";
  }
}

void main();
