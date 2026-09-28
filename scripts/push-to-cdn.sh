#!/usr/bin/env bash
#
# 把文件追加到 cdn 分支并推送（客户端从 jsDelivr 拉这个分支上的文件）。
#
# 为什么是「先克隆再追加」而不是强推一个孤儿分支：
#   Windows 与 Android 两个作业是并行跑的，都要往这个分支写文件。
#   早先用孤分支强推，把一个已经推上去的 APK 整个盖掉了（实测丢过一次，
#   日志显示两个作业都成功，但分支上就是没有 APK）。
#   所以统一成「克隆（没有就新建）→ 追加 → pull --rebase 后重试推送」，
#   两个作业谁先谁后都不会丢对方的文件。
#
# 用法：
#   scripts/push-to-cdn.sh --repo owner/name --token "$GH_TOKEN" \
#     --message "Publish v0.2.1 to CDN" release/cdn-assets/*
#
# 参数：
#   --repo     owner/name；也接受完整远端地址（本地测试或自建 git 用）
#   --token    GitHub token；本地手工跑可省略（走本机凭据）
#   --message  提交信息，必填
#   其余参数  要放进分支的文件路径，按原文件名落盘

set -euo pipefail

repo=""
token=""
message=""
files=()

while [ $# -gt 0 ]; do
  case "$1" in
    --repo) repo="${2:-}"; shift 2 ;;
    --token) token="${2:-}"; shift 2 ;;
    --message) message="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *) files+=("$1"); shift ;;
  esac
done

if [ -z "$repo" ]; then
  echo "缺少 --repo" >&2
  exit 1
fi
if [ -z "$message" ]; then
  echo "缺少 --message" >&2
  exit 1
fi
if [ "${#files[@]}" -eq 0 ]; then
  echo "没有要上传的文件" >&2
  exit 1
fi

# 不要写成 `[ -n "$token" ] && url=...`：token 为空时整条链返回 1，set -e 会直接退出
case "$repo" in
  # 已经是完整地址（本地路径、file:// 或自建 git）就直接用
  *://*|/*|[A-Za-z]:[/\\]*) url="$repo" ;;
  *) url="https://github.com/${repo}.git" ;;
esac
if [ -n "$token" ]; then
  denom="https://github.com/${repo}.git"
  if [ "$url" = "$denom" ]; then
    url="https://x-access-token:${token}@github.com/${repo}.git"
  fi
fi

work="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/cdn-push"
rm -rf "$work"

# 分支还没建立（第一次发布，或对方作业还没推上来）就地新建，避免依赖执行顺序
if ! git clone -q --branch cdn "$url" "$work" 2>/dev/null; then
  echo "cdn 分支还不存在，本次新建"
  mkdir -p "$work"
  git -C "$work" init -q
  git -C "$work" checkout -q --orphan cdn
  git -C "$work" remote add origin "$url"
fi

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "找不到文件：$file" >&2
    exit 1
  fi
  cp "$file" "$work/$(basename "$file")"
done

git -C "$work" add -A
if git -C "$work" diff --cached --quiet; then
  echo "cdn 分支没有变化，跳过"
  exit 0
fi

git -C "$work" -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit -q -m "$message"

for attempt in 1 2 3 4 5; do
  # 对方刚好也在推，就拉一次把自己的提交挪到最上面
  git -C "$work" pull -q --rebase origin cdn 2>/dev/null || true
  if git -C "$work" push -q origin cdn; then
    echo "cdn 分支已更新（第 $attempt 次）"
    git -C "$work" ls-files
    exit 0
  fi
  echo "推送被拒（第 $attempt 次），5 秒后重试"
  sleep 5
done

echo "cdn 分支推送失败" >&2
exit 1
