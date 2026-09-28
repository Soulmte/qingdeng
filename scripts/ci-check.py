"""查 GitHub 上的流水线状态：发布作业与下载页部署。

凭据从本机 git 凭据管理器取，不打印出来。

    python scripts/ci-check.py runs          最近几次流水线
    python scripts/ci-check.py jobs <id>     某次流水线的每一步
    python scripts/ci-check.py pages         下载页的部署配置
    python scripts/ci-check.py release <版本> 某个版本的发布资产
"""

import json
import subprocess
import sys
import urllib.error
import urllib.request

REPO = "Soulmte/qingdeng"


def token() -> str:
    proc = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True,
        text=True,
        check=True,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise SystemExit("拿不到 GitHub 凭据")


def api(path: str):
    request = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Authorization": f"Bearer {token()}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "qingdeng-ci-check",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "runs"

    if mode == "runs":
        for run in api(f"/repos/{REPO}/actions/runs?per_page=6")["workflow_runs"]:
            print(
                f'{run["status"]:<12} {run["conclusion"] or "-":<10} '
                f'{run["head_branch"] or "-":<8} {run["head_sha"][:7]}  {run["name"]}  id={run["id"]}'
            )
    elif mode == "jobs":
        for job in api(f"/repos/{REPO}/actions/runs/{sys.argv[2]}/jobs")["jobs"]:
            print(f'{job["name"]}: {job["status"]} / {job["conclusion"] or "-"}')
            for step in job["steps"]:
                mark = {
                    "success": "ok  ",
                    "failure": "FAIL",
                    "skipped": "skip",
                }.get(step["conclusion"] or "", "....")
                print(f"  {mark} {step['name']}")
    elif mode == "dispatch":
        request = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/actions/workflows/{sys.argv[2]}/dispatches",
            method="POST",
            data=json.dumps({"ref": sys.argv[3] if len(sys.argv) > 3 else "main"}).encode(),
            headers={
                "Authorization": f"Bearer {token()}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "qingdeng-ci-check",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            print(f'已触发 {sys.argv[2]}（HTTP {response.status}）')
    elif mode == "repo":
        data = api(f"/repos/{REPO}")
        print(f'可见性：{data["visibility"]}  私有：{data["private"]}')
        print(f'默认分支：{data["default_branch"]}')
    elif mode == "enable-pages":
        request = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/pages",
            method="POST",
            data=json.dumps({"build_type": "workflow"}).encode(),
            headers={
                "Authorization": f"Bearer {token()}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "qingdeng-ci-check",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                print(f'HTTP {response.status}')
                print(response.read().decode())
        except urllib.error.HTTPError as error:
            print(f"HTTP {error.code}")
            print(error.read().decode())
    elif mode == "pages":
        print(json.dumps(api(f"/repos/{REPO}/pages"), indent=2, ensure_ascii=False))
    elif mode == "release":
        data = api(f"/repos/{REPO}/releases/tags/v{sys.argv[2]}")
        print(f'{data["tag_name"]} / {data["name"]}')
        for asset in data["assets"]:
            print(f'  {asset["name"]:<45} {asset["size"]:>10}')
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
