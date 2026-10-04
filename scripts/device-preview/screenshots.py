"""重新生成全套界面截图：README 与下载页共用同一批，保证两份配图不会走样。

    python scripts/device-preview/screenshots.py

- README（docs/images）：桌面五个页面 + 手机两张
- 下载页（site/img）：一张整窗口、一张手机、三张 16:9 细节特写

细节特写是从桌面的整图上裁的（表盘、任务进度条、柱状图），
同一批数据、同一个主题，所以整页看起来是一套东西。
"""

import pathlib
import shutil

from PIL import Image

import shots

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent.parent
SITE_IMG = REPO / "site/img"
DOCS_IMG = REPO / "docs/images"

DETAIL_SIZE = (1280, 720)

# 裁剪框在 1440x900 的整图上量，坐标不能超出图片高度
DETAILS = {
    "dial.png": ("single-timer.png", (525, 300, 1185, 671)),
    "task.png": ("single-tasks.png", (290, 200, 1420, 835)),
    "chart.png": ("single-stats.png", (350, 250, 1400, 840)),
}

# README 用的桌面页面，文件名与 README 里的引用一致
READMES = ["timer", "countdowns", "tasks", "modes", "stats", "settings"]


def main() -> None:
    shots.build_probe()
    shots.shoot_singles()

    DOCS_IMG.mkdir(exist_ok=True)
    SITE_IMG.mkdir(exist_ok=True)
    out = shots.OUT

    for name in READMES:
        source = out / f"single-{name}.png"
        shutil.copy(source, DOCS_IMG / f"{name}.png")
        print(f"docs/images/{name}.png")

    for name, (source, box) in DETAILS.items():
        Image.open(out / source).convert("RGB").crop(box).resize(
            DETAIL_SIZE, Image.LANCZOS
        ).save(SITE_IMG / name)
        print(f"site/img/{name}  <- {source} {box}")

    shutil.copy(out / "single-timer.png", SITE_IMG / "window.png")
    shutil.copy(out / "single-phone-timer.png", SITE_IMG / "phone.png")
    shutil.copy(out / "single-phone-timer.png", DOCS_IMG / "phone.png")
    print("site/img/window.png, site/img/phone.png, docs/images/phone.png")


if __name__ == "__main__":
    main()
