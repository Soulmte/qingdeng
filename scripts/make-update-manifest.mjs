#!/usr/bin/env node
/**
 * 生成更新清单 latest.json。
 *
 * 客户端启动时按 fixed 的 endpoints 顺序拉清单，版本号比本地新的就弹窗，
 * 展示清单里的 notes 作为「更新内容」；安装包与 signature 都由发布私钥签名，
 * 客户端用 tauri.conf.json 里的公钥校验，所以中间经过任何 CDN 都不影响安全。
 *
 * 国内下载慢的问题靠「安装包地址指向 jsDelivr」解决，而不是 GitHub 直链：
 *   https://cdn.jsdelivr.net/gh/<repo>@cdn/QingDeng_<版本>_x64-setup.exe
 * 该文件由发布流水线推到仓库的 cdn 分支，文件名带版本号，命中 jsDelivr 的永久缓存。
 * 想换成自建 CDN（阿里云 OSS / 腾讯云 COS 等）只需改 --asset-base。
 *
 * 用法：
 *   node scripts/make-update-manifest.mjs --notes-file docs/release-notes/0.2.0.md
 *   node scripts/make-update-manifest.mjs --asset-base https://oss.example.com/qingdeng --notes "..."
 *
 * 参数：
 *   --repo        GitHub 仓库，默认 Soulmte/qingdeng
 *   --asset-base  安装包下载地址前缀，默认指向仓库的 cdn 分支（jsDelivr）
 *   --asset-name  安装包上传后使用的文件名，默认用本地文件名
 *   --notes       直接给出更新内容（与 --notes-file 二选一）
 *   --notes-file  从文件读取更新内容（推荐，支持多行与 "- " 列表）
 *   --out         输出路径，默认 release/latest.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REPO = "Soulmte/qingdeng";

const argv = process.argv.slice(2);
const args = new Map();
for (let index = 0; index < argv.length; index += 1) {
  const token = argv[index];
  if (!token.startsWith("--")) continue;
  const next = argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(token.slice(2), next);
    index += 1;
  } else {
    args.set(token.slice(2), "true");
  }
}

function fail(message) {
  console.error(`生成失败：${message}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const { version, productName } = config;
const pubkey = config.plugins?.updater?.pubkey;
if (!pubkey) fail("tauri.conf.json 里没有 plugins.updater.pubkey");

const repo = args.get("repo") || DEFAULT_REPO;
// 默认走 jsDelivr，国内比 GitHub 直链快得多
const assetBase = (
  args.get("asset-base") || `https://cdn.jsdelivr.net/gh/${repo}@cdn`
).replace(/\/+$/, "");
const githubBase = `https://github.com/${repo}/releases/download/v${version}`;
const encodePath = (name) => encodeURIComponent(name);

// ── Windows 更新包 ──────────────────────────────────────────
// updater 要下载的是「updater bundle」，格式由 createUpdaterArtifacts 决定：
//   "v1Compatible" -> 青灯_x.y.z_x64-setup.nsis.zip
//   true            -> 青灯_x.y.z_x64-setup.exe
// 清单里的 url 与 signature 必须指向同一个文件，否则校验必失败，
// 所以这里严格按配置选，不靠猜。
const nsisDir = join(root, "src-tauri/target/release/bundle/nsis");
const names = existsSync(nsisDir) ? readdirSync(nsisDir) : [];

const v1Compatible = config.bundle?.createUpdaterArtifacts === "v1Compatible";
const preferredSuffix = v1Compatible ? "-setup.nsis.zip" : "-setup.exe";
const otherSuffix = v1Compatible ? "-setup.exe" : "-setup.nsis.zip";

/** 找出带签名的更新包；同一个后缀可能留着多次构建的产物，取最新的 */
const findUpdater = (suffix) =>
  names
    .filter(
      (name) =>
        name.endsWith(suffix) &&
        name.includes(version) &&
        existsSync(join(nsisDir, `${name}.sig`)),
    )
    .map((name) => ({ name, mtime: statSync(join(nsisDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.name;

const updater = findUpdater(preferredSuffix);
if (!updater) {
  const hasArtifact = names.some(
    (name) => name.endsWith(preferredSuffix) && name.includes(version),
  );
  fail(
    hasArtifact
      ? `${version} 的更新包缺 .sig 签名文件，updater 会拒绝它。\n` +
          "说明打包时没提供签名私钥：\n" +
          "  set TAURI_SIGNING_PRIVATE_KEY=%USERPROFILE%\\.tauri\\qingdeng.key\n" +
          "  npm run tauri build"
      : `在 ${nsisDir} 没找到 ${version} 的 ${preferredSuffix}。\n` +
          `（createUpdaterArtifacts 当前为 ${JSON.stringify(config.bundle?.createUpdaterArtifacts)}）\n` +
          "请先完成一次带签名的打包：npm run tauri build",
  );
}

const fallback = findUpdater(otherSuffix);
if (fallback) {
  console.log(
    `提示：目录里还有 ${fallback}，与当前配置产出的是同版本的另一种格式，已按配置选 ${updater}`,
  );
}

// 手动安装用的普通安装包，不参与自动更新
const manualInstaller = names.find((name) => name.endsWith("-setup.exe") && name.includes(version));

// 文件名取自 productName（青灯），资产名换成纯英文：
// 一是避免下载地址里出现非 ASCII 字符，二是 jsDelivr 会拦掉 .exe
const assetName = args.get("asset-name") || updater;

// ── 更新内容 ────────────────────────────────────────────────
let notes = args.get("notes") ?? "";
const notesFile = args.get("notes-file");
if (notesFile) {
  const path = resolve(root, notesFile);
  if (!existsSync(path)) fail(`更新说明文件不存在：${path}`);
  notes = readFileSync(path, "utf8").trim();
}
if (!notes || notes === "true") {
  fail("请用 --notes 或 --notes-file 提供更新内容，弹窗里会原样展示");
}

// Tauri 会先校验整份清单再看版本号，所以只写它认识的键，
// Android 下载地址之类额外信息放到 Release 说明里，不要塞进 platforms
const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  pubkey,
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(join(nsisDir, `${updater}.sig`), "utf8").trim(),
      url: `${assetBase}/${encodePath(assetName)}`,
    },
  },
};

const outPath = resolve(root, args.get("out") || "release/latest.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`${productName} ${version} 的更新清单已生成：${outPath}`);
console.log(`客户端拉取地址：https://cdn.jsdelivr.net/gh/${repo}@cdn/latest.json`);
console.log(`  备选（GitHub 直链）：https://github.com/${repo}/releases/latest/download/latest.json`);
console.log(`更新包地址（国内加速）：${manifest.platforms["windows-x86_64"].url}`);
console.log(`  GitHub 直链：${githubBase}/${encodePath(assetName)}`);
if (assetName !== updater) {
  console.log(`注意：本地文件名是 ${updater}，上传时必须重命名为 ${assetName}，否则下载 404`);
}
console.log("\n需要上传的文件：");
console.log(`  [cdn 分支，客户端从这里下载]`);
console.log(`    1. ${updater}          -> ${assetName}`);
console.log(`    2. ${updater}.sig      -> ${assetName}.sig`);
console.log(`    3. ${outPath}            -> latest.json`);
console.log(`  [Release，供人工下载]`);
if (manualInstaller) {
  console.log(`    ${manualInstaller}（手动安装包，不参与自动更新）`);
}
console.log("cdn 分支上文件名必须与 url 完全一致；jsDelivr 拦 .exe，所以更新包用 .nsis.zip。");
