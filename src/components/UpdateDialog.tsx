import { Button } from "@heroui/react";
import { Download, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { parseNotes } from "@/lib/updater";
import { useUpdateStore } from "@/stores/updateStore";

/**
 * 启动时发现有新版本就弹出的更新提示。
 * 内容全部来自 CDN 清单，安装包在客户端用配置里的公钥校验过签名。
 */
export function UpdateDialog() {
  const open = useUpdateStore((state) => state.open);
  const info = useUpdateStore((state) => state.info);
  const phase = useUpdateStore((state) => state.phase);
  const percent = useUpdateStore((state) => state.percent);
  const message = useUpdateStore((state) => state.message);
  const install = useUpdateStore((state) => state.install);
  const close = useUpdateStore((state) => state.close);
  const skipVersion = useUpdateStore((state) => state.skipVersion);

  if (!open || !info) return null;

  const busy = phase === "downloading" || phase === "installing";
  const notes = parseNotes(info.notes);

  return (
    <Dialog
      open={open}
      // 下载过程中不允许关掉，避免状态和实际安装对不上
      onClose={busy ? () => undefined : close}
      title={`发现新版本 ${info.version}`}
      description={`当前版本 ${info.currentVersion}${
        info.date ? ` · 发布于 ${info.date.slice(0, 10)}` : ""
      }`}
      footer={
        phase === "error" ? (
          <>
            <Button variant="ghost" onPress={close}>
              关闭
            </Button>
            <Button variant="primary" onPress={install}>
              <RefreshCw className="size-4" />
              重试
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" isDisabled={busy} onPress={skipVersion}>
              忽略此版本
            </Button>
            <Button variant="ghost" isDisabled={busy} onPress={close}>
              稍后提醒
            </Button>
            <Button variant="primary" isDisabled={busy} onPress={install}>
              <Download className="size-4" />
              {busy ? "正在更新" : "立即更新"}
            </Button>
          </>
        )
      }
    >
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">更新内容</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted">这次更新没有附说明。</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {notes.map((line, index) => (
              <li
                key={`${index}-${line.text}`}
                className="flex gap-2 text-sm leading-relaxed text-muted"
              >
                <span
                  aria-hidden
                  className={`mt-2 size-1 shrink-0 rounded-full ${
                    line.bullet ? "bg-accent" : "bg-transparent"
                  }`}
                />
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {busy || phase === "error" ? (
        <section className="flex flex-col gap-2 rounded-field bg-default p-3.5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span>
              {phase === "downloading"
                ? percent === null
                  ? "正在下载更新"
                  : `正在下载更新 ${percent}%`
                : phase === "installing"
                  ? "下载完成，正在安装"
                  : "更新失败"}
            </span>
            <span className="clock-digits">{percent === null ? "" : `${percent}%`}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ring-track">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
              style={{ width: `${phase === "downloading" ? (percent ?? 15) : 100}%` }}
            />
          </div>
          {phase === "error" && message ? (
            <p className="text-xs text-danger">{message}</p>
          ) : null}
        </section>
      ) : null}
    </Dialog>
  );
}
