import { Button, ProgressBar } from "@heroui/react";
import { Download, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { formatBytes, parseNotes } from "@/lib/updater";
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
  const downloaded = useUpdateStore((state) => state.downloaded);
  const total = useUpdateStore((state) => state.total);
  const speed = useUpdateStore((state) => state.speed);
  const message = useUpdateStore((state) => state.message);
  const install = useUpdateStore((state) => state.install);
  const close = useUpdateStore((state) => state.close);
  const skipVersion = useUpdateStore((state) => state.skipVersion);

  if (!open || !info) return null;

  const busy = phase === "downloading" || phase === "installing";
  const notes = parseNotes(info.notes);

  // 有总大小就是真实百分比，拿不到才退化成不确定态；
  // 清单里带了安装包大小，下载一开始就是确定进度，不会先跑一段假的动画
  const determinate = phase !== "downloading" || percent !== null;
  const progressValue = phase === "installing" ? 100 : (percent ?? 0);

  const progressLabel =
    phase === "downloading"
      ? "正在下载更新"
      : phase === "installing"
        ? "下载完成，正在安装"
        : "更新失败";

  return (
    <Dialog
      open={open}
      // 下载过程中不允许关掉，避免状态和实际安装对不上
      onClose={busy ? () => undefined : close}
      className="max-w-md"
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
          <div className="flex max-h-[42dvh] flex-col gap-1.5 overflow-y-auto pr-1">
            {notes.map((line, index) =>
              line.heading ? (
                <h4
                  key={`${index}-${line.text}`}
                  className="mt-2 text-sm font-medium text-foreground first:mt-0"
                >
                  {line.text}
                </h4>
              ) : (
                <div
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
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {busy || phase === "error" ? (
        <section className="flex flex-col gap-3 rounded-field bg-default p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-foreground">{progressLabel}</span>
            {percent !== null ? (
              <span className="clock-digits text-sm font-semibold text-accent">{percent}%</span>
            ) : null}
          </div>

          <ProgressBar
            aria-label={progressLabel}
            color="accent"
            size="lg"
            value={determinate ? progressValue : undefined}
            isIndeterminate={!determinate}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>

          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="clock-digits">
              {phase === "error"
                ? "已中断"
                : total !== null
                  ? `${formatBytes(downloaded)} / ${formatBytes(total)}`
                  : phase === "installing"
                    ? "安装包已下载完成"
                    : `已下载 ${formatBytes(downloaded)}`}
            </span>
            {phase === "downloading" && speed > 0 ? (
              <span className="clock-digits">{formatBytes(speed)}/s</span>
            ) : null}
          </div>

          {phase === "error" && message ? (
            <p className="text-xs text-danger">{message}</p>
          ) : null}
        </section>
      ) : null}
    </Dialog>
  );
}
