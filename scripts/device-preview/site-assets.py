"""重新生成下载页用的截图：先按设备尺寸截整图，再裁出三张细节特写。

下载页的图必须成套（同一份演示数据、同一个主题），散着更新很容易变成风格不一致，
所以整个流程收在这一个脚本里：

    python scripts/device-preview/site-assets.py

产物直接写进 site/img/；手机那张另外同步一份到 docs/images/phone.png 供 README 用。
"""

import pathlib
import shutil

from PIL import Image

import shots

ROOT = pathlib.Path(__file__).resolve().parent
SITE_IMG = ROOT.parent.parent / "site/img"
DOCS_IMG = ROOT.parent.parent / "docs/images"
DETAIL_SIZE = (1280, 720)

# 细节图的裁剪框在 1440x900 的整图上量，坐标不能超出图片高度
# 三张分别对应三种形状：表盘、任务进度条、柱状图
DETAILS = {
    "dial.png": ("single-timer.png", (525, 300, 1185, 671)),
    "task.png": ("single-tasks.png", (290, 200, 1420, 835)),
    "chart.png": ("single-stats.png", (350, 250, 1400, 840)),
}


def main() -> None:
    shots.build_probe()
    shots.shoot_singles()

    SITE_IMG.mkdir(exist_ok=True)
    out = shots.OUT

    shutil.copy(out / "single-timer.png", SITE_IMG / "window.png")
    print("window.png <- single-timer.png")

    for name, (source, box) in DETAILS.items():
        image = Image.open(out / source).convert("RGB")
        image.crop(box).resize(DETAIL_SIZE, Image.LANCZOS).save(SITE_IMG / name)
        print(f"{name} <- {source} {box}")

    shutil.copy(out / "single-phone-timer.png", SITE_IMG / "phone.png")
    shutil.copy(out / "single-phone-timer.png", DOCS_IMG / "phone.png")
    print("phone.png <- single-phone-timer.png（同时写到 docs/images/）")


if __name__ == "__main__":
    main()
