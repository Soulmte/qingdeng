#!/usr/bin/env node
/**
 * 生成更新清单 latest.json。
 *
 * 清单托管在 GitHub Releases 上，客户端按固定地址拉取：
 *   https://github.com/<repo>/releases/latest/download/latest.json
 * 版本号比本地新的就弹窗，展示清单里的 notes 作为「更新内容」；
 * 安装包与 signature 都由发布私钥签名，客户端用 tauri.conf.json 里的公钥校验。
 *
 * 用法：
 *   node scripts/make-update-manifest.mjs --notes-file docs/release-notes/0.2.0.md
 *   node scripts/make-update-manifest.mjs --repo Soulmte/qingdeng --asset-name QingDeng_0.2.0_x64-setup.exe --notes "..."
 *
 * 参数：
 *   --repo        GitHub 仓库，默认 Soulmte/qingdeng
 *   --base        安装包下载地址前缀，默认按仓库与版本号推导
 *   --asset-name  安装包上传到 Release 后使用的文件名，默认用本地文件名
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
const base = (args.get("base") || `https://github.com/${repo}/releases/download/v${version}`)
  .replace(/\/+$/, "");
const encodePath = (name) => encodeURIComponent(name);

// ── Windows 安装包 ──────────────────────────────────────────
// 同一个目录里可能同时留着以前构建的产物，优先选带签名的最新的那个
const nsisDir = join(root, "src-tauri/target/release/bundle/nsis");
const listing = existsSync(nsisDir) ? readdirSync(nsisDir) : [];
const candidates = listing
  .filter((name) => name.endsWith("-setup.exe") && name.includes(version))
  .map((name) => ({
    name,
    signed: existsSync(join(nsisDir, `${name}.sig`)),
    mtime: statSync(join(nsisDir, name)).mtimeMs,
  }))
  .sort((a, b) => Number(b.signed) - Number(a.signed) || b.mtime - a.mtime);

const installer = candidates[0]?.name;
if (!installer) {
  fail(
    `在 ${nsisDir} 没找到 ${version} 的 NSIS 安装包。\n` +
      "请先打包，并确保带上了签名私钥：\n" +
      "  set TAURI_SIGNING_PRIVATE_KEY=%USERPROFILE%\\.tauri\\qingdeng.key\n" +
      "  npm run tauri build",
  );
}

const signatureFile = join(nsisDir, `${installer}.sig`);
if (!existsSync(signatureFile)) {
  fail(
    `${installer} 没有配套的 .sig 签名文件。\n` +
      "说明打包时没提供签名私钥，updater 会拒绝这样的包。\n" +
      "  set TAURI_SIGNING_PRIVATE_KEY=%USERPROFILE%\\.tauri\\qingdeng.key\n" +
      "  npm run tauri build",
  );
}

// 安装包文件名取自 productName（青灯），Release 资产名可以换成纯英文，
// 避免下载地址里出现非 ASCII 字符
const assetName = args.get("asset-name") || installer;

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

// ── Android 安装包（可选，只用于给出手工下载地址） ────────────
const apkPath = join(
  root,
  "src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk",
);
const hasApk = existsSync(apkPath);

const manifest = {
  version,
  notes,
  pubkey,
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(signatureFile, "utf8").trim(),
      url: `${base}/${encodePath(assetName)}`,
    },
  },
};

if (hasApk) {
  // updater 在 Android 上不可用，这项是给应用内「前往下载」用的
  manifest.android = { url: `${base}/app-universal-release.apk` };
}

const outPath = resolve(root, args.get("out") || "release/latest.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`${productName} ${version} 的更新清单已生成：${outPath}`);
console.log(`客户端拉取地址：https://github.com/${repo}/releases/latest/download/latest.json`);
console.log(`安装包地址：${manifest.platforms["windows-x86_64"].url}`);
if (assetName !== installer) {
  console.log(`注意：本地文件名是 ${installer}，上传时必须重命名为 ${assetName}，否则下载 404`);
}
console.log(hasApk ? "已附带 Android APK 下载地址" : "未找到 Android APK，清单里不含下载地址");
console.log("\n发布时把这几样挂到同一个 Release 上：");
console.log(`  1. ${outPath}            -> latest.json`);
console.log(`  2. ${installer}          -> ${assetName}`);
console.log(`  3. ${installer}.sig      -> ${assetName}.sig`);
