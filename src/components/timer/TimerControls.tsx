import { Button } from "@heroui/react";
import { Flag, Maximize2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImmersiveStore } from "@/stores/immersiveStore";
import { useTimerStore } from "@/stores/timerStore";

/** 计时控制条，页面与沉浸模式共用同一套按钮 */
export function TimerControls({
  variant = "page",
  className,
}: {
  variant?: "page" | "immersive";
  className?: string;
}) {
  const status = useTimerStore((state) => state.status);
  const elapsedMs = useTimerStore((state) => state.elapsedMs);
  const toggle = useTimerStore((state) => state.toggle);
  const endPhase = useTimerStore((state) => state.endPhase);
  const reset = useTimerStore((state) => state.reset);
  const skip = useTimerStore((state) => state.skip);
  const enterImmersive = useImmersiveStore((state) => state.enter);

  const running = status === "running";
  const startLabel = running ? "暂停" : status === "paused" ? "继续" : "开始";
  const nothingYet = status === "idle" && elapsedMs === 0;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      <Button variant="primary" size="lg" className="min-w-36" onPress={toggle}>
        {running ? <Pause className="size-4" /> : <Play className="size-4" />}
        {startLabel}
      </Button>

      <Button
        variant="secondary"
        size="lg"
        aria-label="结束本段，已用的时间会计入统计"
        onPress={endPhase}
        isDisabled={nothingYet}
      >
        <Flag className="size-4" />
        结束本段
      </Button>

      <Button
        variant="ghost"
        size="lg"
        isIconOnly
        aria-label="重置当前阶段"
        onPress={reset}
        isDisabled={nothingYet}
      >
        <RotateCcw className="size-4" />
      </Button>

      <Button variant="ghost" size="lg" isIconOnly aria-label="跳过本段" onPress={skip}>
        <SkipForward className="size-4" />
      </Button>

      {variant === "page" ? (
        <Button variant="outline" size="lg" onPress={enterImmersive}>
          <Maximize2 className="size-4" />
          沉浸模式
        </Button>
      ) : null}

      {variant === "page" ? (
        <p className="w-full text-center text-xs text-muted">
          「结束本段」把已用时间计入统计后接续下一段；重置清零当前阶段；跳过不计入本段用时。
        </p>
      ) : null}
    </div>
  );
}
