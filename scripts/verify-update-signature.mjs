#!/usr/bin/env node
/**
 * 校验更新清单里的签名确实能验通待发布的更新包。
 *
 * 为什么需要：updater 只认签名，一旦清单里的 signature 与上传的文件对不上
 * （换错了文件、传了旧的 .sig、改了资产名却没改 url），
 * 用户端会下载成功但校验失败，表现为「更新点了没反应」，而且只有真正发版之后才暴露。
 * 所以这里在打包机上先验一遍，验不过就别发布。
 *
 * 验的是 minisign 格式：先从 tauri.conf.json 的 pubkey 还原公钥，
 * 再用它验证清单里的 signature。两种算法都支持：
 *   "Ed" 直接对文件内容签名，"ED" 先对文件做 BLAKE2b-512 再签名。
 *
 * 用法：
 *   node scripts/verify-update-signature.mjs                        # 自动在 bundle 目录里按签名反查文件
 *   node scripts/verify-update-signature.mjs --artifact path/to/file
 */
import { createHash, createPublicKey, verify as verifyEd25519 } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  console.error(`签名校验失败：${message}`);
  process.exit(1);
}

/** minisign 的公钥是「注释行 + base64」两行，Tauri 又把整段做了 base64 */
function decodePublicKey(raw) {
  const text = Buffer.from(raw.trim(), "base64").toString("utf8");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) fail("公钥格式不对，读不到第二条 base64");

  const blob = Buffer.from(lines[1], "base64");
  const algorithm = blob.subarray(0, 2).toString("ascii");
  if (algorithm !== "Ed") fail(`公钥算法不是 Ed25519（读到 ${algorithm}）`);

  return {
    keyId: blob.subarray(2, 10),
    publicKey: blob.subarray(10, 42),
  };
}

function decodeSignature(raw) {
  // Tauri 把整份 minisign 签名（注释行 + base64）又做了一次 base64，
  // 和公钥的处理方式一致，先解一层再按行读
  const lines = Buffer.from(raw.trim(), "base64")
    .toString("utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) fail("签名格式不对，读不到第二条 base64");

  const blob = Buffer.from(lines[1], "base64");
  return {
    algorithm: blob.subarray(0, 2).toString("ascii"),
    keyId: blob.subarray(2, 10),
    signature: blob.subarray(10, 74),
    trustedComment: lines.find((line) => line.startsWith("trusted comment:")) ?? "",
  };
}

const config = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
if (!config.plugins?.updater?.pubkey) fail("tauri.conf.json 里没有 plugins.updater.pubkey");

const manifestPath = resolve(root, args.get("manifest") || "release/latest.json");
if (!existsSync(manifestPath)) fail(`找不到清单：${manifestPath}，先跑 make-update-manifest.mjs`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const platform = manifest.platforms?.["windows-x86_64"];
if (!platform) fail("清单里没有 windows-x86_64");

// 没指定文件时，按签名内容在 bundle 目录里反查，避免传错配对
let artifactPath = args.get("artifact");
if (!artifactPath || artifactPath === "true") {
  const nsisDir = join(root, "src-tauri/target/release/bundle/nsis");
  const wanted = platform.signature.trim();
  const match = (existsSync(nsisDir) ? readdirSync(nsisDir) : []).find(
    (name) => name.endsWith(".sig") && readFileSync(join(nsisDir, name), "utf8").trim() === wanted,
  );
  if (!match) {
    fail(
      "在 src-tauri/target/release/bundle/nsis 里找不到与清单签名配对的 .sig。\n" +
        "多半是清单与最新一次打包不是同一批产物，重新跑一次打包与清单生成。",
    );
  }
  artifactPath = join(nsisDir, match.slice(0, -".sig".length));
  console.log(`按签名反查到待发布文件：${basename(artifactPath)}`);
} else {
  artifactPath = resolve(root, artifactPath);
}

if (!existsSync(artifactPath)) fail(`找不到文件：${artifactPath}`);

const file = readFileSync(artifactPath);
const key = decodePublicKey(config.plugins.updater.pubkey);
const sig = decodeSignature(platform.signature);

if (!key.keyId.equals(sig.keyId)) {
  fail("公钥与签名的 keyId 不一致，说明这把签名不是当前配置的公钥对应的私钥签的");
}

// 默认算法直接签文件内容；"ED" 是先算 BLAKE2b-512 摘要再签
const message =
  sig.algorithm === "ED" ? createHash("blake2b512").update(file).digest() : file;

const publicKeyObject = createPublicKey({
  key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), key.publicKey]),
  format: "der",
  type: "spki",
});

if (!verifyEd25519(null, message, publicKeyObject, sig.signature)) {
  fail(
    `签名验不过：${basename(artifactPath)}\n` +
      "清单里的 signature 与这个文件不匹配，发布出去用户会更新失败。",
  );
}

console.log(`签名有效：${basename(artifactPath)}`);
console.log(`  算法 ${sig.algorithm}，keyId ${key.keyId.toString("hex").toUpperCase()}`);
console.log(`  文件 ${file.length} 字节`);
if (sig.trustedComment) console.log(`  ${sig.trustedComment}`);
console.log(`  清单版本 ${manifest.version}`);
