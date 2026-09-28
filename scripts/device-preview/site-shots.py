"""下载页截图：页面很长，用 iframe 向上位移分段截取，每段都保持原始缩放。

用法：python .devices/site-shots.py [标签...]
"""

import pathlib
import subprocess
import sys

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent.parent
SITE = REPO / "site"
OUT = ROOT / "out"
PAGE_HEIGHT = 7200
BUDGET_MS = 6000

VIEWPORTS = {
    "site-desktop": (1440, 1600),
    "site-phone": (390, 1400),
}

WRAPPER = """<!doctype html>
<html><head><meta charset="utf-8"><title>{name}</title>
<style>html,body{{margin:0;padding:0;overflow:hidden;background:#fff}}
iframe{{position:absolute;left:0;border:0}}</style></head>
<body>
<iframe width="{w}" height="{page_h}" style="top:-{top}px" src="{src}"></iframe>
</body></html>
"""


def main() -> None:
    wanted = sys.argv[1:] or list(VIEWPORTS)
    OUT.mkdir(exist_ok=True)

    for name in wanted:
        width, slice_h = VIEWPORTS[name]
        top = 0
        index = 1
        while top < 6000:
            wrapper = ROOT / f"{name}-{index}.html"
            wrapper.write_text(
                WRAPPER.format(
                    name=name, w=width, page_h=PAGE_HEIGHT, top=top, src=SITE.joinpath("index.html").as_uri()
                ),
                encoding="utf-8",
            )
            target = OUT / f"{name}-{index}.png"
            subprocess.run(
                [
                    EDGE,
                    "--headless=new",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    "--force-device-scale-factor=1",
                    f"--window-size={width},{slice_h}",
                    f"--virtual-time-budget={BUDGET_MS}",
                    f"--screenshot={target}",
                    wrapper.as_uri(),
                ],
                check=True,
                capture_output=True,
            )
            print(f"  {target.name}  top={top}")
            top += slice_h
            index += 1


if __name__ == "__main__":
    main()
