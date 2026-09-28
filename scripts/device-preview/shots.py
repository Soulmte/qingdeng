"""按设备尺寸截图核对布局：先把探针打包好，再逐台设备截出来裁切。

外层窗口有最小宽度限制（Chromium 在 Windows 上约 496px），390px 的手机视口根本设不进去，
所以把真正的布局放进 iframe：iframe 的视口就是它的 CSS 尺寸，与外层窗口无关。

探针跑在浏览器里而不是 SSR，因为 zustand 的服务端快照读的是初始状态，
用 renderToStaticMarkup 就看不到真实数据；这里用一个假数据库喂演示数据，
各页面能带着真实结构的数据渲染出来。

用法：
    python scripts/device-preview/shots.py                 # 全部 sheet
    python scripts/device-preview/shots.py phone-pages     # 只截其中一组
    python scripts/device-preview/site-shots.py            # 下载页（长页分段截）
"""

import pathlib
import shutil
import subprocess
import sys

from PIL import Image

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent.parent
OUT = ROOT / "out"
GAP = 16
BUDGET_MS = 6000

DEVICES = {
    "phone": (390, 844, True),
    "phone-land": (844, 390, True),
    "tablet": (800, 1280, True),
    "tab-land": (1280, 800, True),
    "desktop": (1440, 900, False),
}

# 每个 sheet 是一排“设备:页面”组合，都按亮色主题截
SHEETS = {
    "phone-pages": ["phone:timer", "phone:tasks", "phone:stats", "phone:settings"],
    "phone-other": ["phone-land:timer", "tablet:timer"],
    "tablet": ["tab-land:timer", "tab-land:stats"],
    "desktop": ["desktop:timer", "desktop:settings"],
    "dialogs": ["phone:dialog", "desktop:dialog"],
}

FRAME = """<!doctype html>
<html><head><meta charset="utf-8"><title>{name}</title>
<style>html,body{{margin:0;padding:0;overflow:hidden;background:#fff}}
iframe{{position:absolute;border:0;display:block}}</style></head>
<body>
{frames}
</body></html>
"""

IFRAME = (
    '<iframe style="left:{x}px;top:0" width="{w}" height="{h}" '
    'src="index.html?page={page}&touch={touch}&theme=light"></iframe>'
)

# 探针要用真实构建出来的样式表，否则改过样式后截的还是旧的
ESBUILD_ALIASES = [
    "--alias:@=./src",
    "--alias:@tauri-apps/plugin-sql=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/plugin-opener=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/plugin-notification=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/plugin-process=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/plugin-updater=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/api/core=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/api/window=./scripts/device-preview/tauri-stub.ts",
    "--alias:@tauri-apps/api/app=./scripts/device-preview/tauri-stub.ts",
]


def build_probe() -> None:
    print("重新构建前端与探针…")
    subprocess.run(["npm", "run", "build"], cwd=REPO, check=True, capture_output=True, shell=True)

    css = next((REPO / "dist/assets").glob("*.css"))
    shutil.copy(css, ROOT / "app.css")

    subprocess.run(
        [
            "npx",
            "--yes",
            "esbuild",
            str(ROOT / "probe.tsx"),
            "--bundle",
            f"--outfile={ROOT / 'probe.js'}",
            "--format=iife",
            "--platform=browser",
            "--jsx=automatic",
            "--define:process.env.NODE_ENV=\"development\"",
            *ESBUILD_ALIASES,
        ],
        cwd=REPO,
        check=True,
        capture_output=True,
        shell=True,
    )


def build_sheet(name: str, items: list[str]) -> tuple[list, int, int]:
    placed = []
    x = 0
    tallest = 0
    for item in items:
        device, page = item.split(":")
        w, h, touch = DEVICES[device]
        placed.append((device, page, x, w, h))
        x += w + GAP
        tallest = max(tallest, h)

    width = x - GAP
    frames = "\n".join(
        IFRAME.format(x=left, w=w, h=h, page=page, touch=1 if DEVICES[device][2] else 0)
        for device, page, left, w, h in placed
    )
    (ROOT / f"sheet-{name}.html").write_text(
        FRAME.format(name=name, frames=frames), encoding="utf-8"
    )
    return placed, width, tallest


def main() -> None:
    wanted = sys.argv[1:] or list(SHEETS)
    OUT.mkdir(exist_ok=True)
    build_probe()

    for name in wanted:
        placed, width, height = build_sheet(name, SHEETS[name])
        canvas = OUT / f"sheet-{name}.png"
        subprocess.run(
            [
                EDGE,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                f"--window-size={width},{height}",
                f"--virtual-time-budget={BUDGET_MS}",
                f"--screenshot={canvas}",
                (ROOT / f"sheet-{name}.html").as_uri(),
            ],
            check=True,
            capture_output=True,
        )

        sheet = Image.open(canvas)
        print(f"[{name}] 画布 {sheet.size}，期望 ({width}, {height})")
        for device, page, left, w, h in placed:
            crop = sheet.crop((left, 0, left + w, min(h, sheet.height)))
            target = OUT / f"{name}-{device}-{page}.png"
            crop.save(target)
            print(f"  裁出 {target.name} {crop.size}")


if __name__ == "__main__":
    main()
