import { useState } from "react";
import { Button } from "@heroui/react";
import { SlidersHorizontal, Timer } from "lucide-react";
import { QUICK_MINUTES } from "@/lib/presets";
import type { TimerKind } from "@/lib/types";
import { useTimerStore } from "@/stores/timerStore";
import { CustomTimeDialog } from "./CustomTimeDialog";

interface QuickStartPanelProps {
  /** 开始之后通常要关掉外层弹窗 */
  onStarted?: () => void;
  /** 外层如果本身是弹窗，把层级传进来，保证自定义时间弹层盖在上面 */
  dialogLayer?: 1 | 2;
}

/** 系统预设时长与自定义单次计时：点了就开始，不改动当前模板 */
export function QuickStartPanel({ onStarted, dialogLayer = 1 }: QuickStartPanelProps) {
  const status = useTimerStore((state) => state.status);
  const startOneOff = useTimerStore((state) => state.startOneOff);
  const [dialogOpen, setDialogOpen] = useState(false);

  const busy = status === "running" || status === "paused";

  const start = (seconds: number, kind: TimerKind) => {
    startOneOff(seconds, kind);
    onStarted?.();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_MINUTES.map((minutes) => (
          <Button
            key={minutes}
            size="sm"
            variant="tertiary"
            isDisabled={busy}
            onPress={() => start(minutes * 60, "countdown")}
          >
            {minutes} 分钟
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" isDisabled={busy} onPress={() => setDialogOpen(true)}>
          <SlidersHorizontal className="size-4" />
          自定义单次时间
        </Button>
        <Button variant="ghost" isDisabled={busy} onPress={() => start(0, "countup")}>
          <Timer className="size-4" />
          开始正计时
        </Button>
      </div>

      {busy ? <p className="text-xs text-muted">计时进行中，暂停或结束当前阶段后才能切换。</p> : null}

      <CustomTimeDialog
        open={dialogOpen}
        layer={dialogLayer}
        onClose={() => setDialogOpen(false)}
        onConfirm={start}
      />
    </div>
  );
}
