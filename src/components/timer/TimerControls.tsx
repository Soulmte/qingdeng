import { Button } from "@heroui/react";
import { Flag, Maximize2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImmersiveStore } from "@/stores/immersiveStore";
import { useTimerStore } from "@/stores/timerStore";

/**
 * 计时控制条，页面与沉浸模式共用同一套按钮。
 *
 * 手机上一行放不下五个带文字的按钮，会折成三行把计时数字挤出屏幕，
 * 所以拆成「主操作 / 次要操作」两组：窄屏上下排列，宽屏自动并成一行。
 */
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
    <div
      className={cn(
        "flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Button
          variant="primary"
          size="lg"
          className="min-w-0 flex-1 sm:min-w-36 sm:max-w-56 sm:flex-none"
          onPress={toggle}
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {startLabel}
        </Button>

        {/* 窄屏把沉浸模式收成一个图标，省下一行的宽度 */}
        {variant === "page" ? (
          <Button
            variant="outline"
            size="lg"
            isIconOnly
            aria-label="进入沉浸模式"
            className="sm:hidden"
            onPress={enterImmersive}
          >
            <Maximize2 className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="min-w-0 flex-1 sm:min-w-36 sm:max-w-56 sm:flex-none"
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
          <Button
            variant="outline"
            size="lg"
            className="hidden sm:inline-flex"
            onPress={enterImmersive}
          >
            <Maximize2 className="size-4" />
            沉浸模式
          </Button>
        ) : null}
      </div>

      {variant === "page" ? (
        <p className="w-full text-center text-[0.7rem] leading-relaxed text-muted sm:text-xs">
          「结束本段」把已用时间计入统计后接续下一段；重置清零当前阶段；跳过不计入本段用时。
        </p>
      ) : null}
    </div>
  );
}
