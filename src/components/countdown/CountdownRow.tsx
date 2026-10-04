import { Button } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { countdownParts, formatTargetAt, primaryUnit } from "@/lib/countdown";
import type { CountdownRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CountdownRowProps {
  countdown: CountdownRecord;
  now: Date;
  onEdit: (countdown: CountdownRecord) => void;
  onDelete: (countdown: CountdownRecord) => void;
  onToggleImmersive: (countdown: CountdownRecord, next: boolean) => void;
}

/** 倒计时的一行：左边是那个大数字，右边是名称、目标时刻与开关 */
export function CountdownRow({
  countdown,
  now,
  onEdit,
  onDelete,
  onToggleImmersive,
}: CountdownRowProps) {
  const parts = countdownParts(countdown.targetAt, now);
  const { value, unit } = primaryUnit(parts);

  return (
    <li
      className={cn(
        "flex flex-col gap-3.5 rounded-field border border-foreground/10 bg-surface p-4 transition-colors sm:flex-row sm:items-center sm:gap-6",
        parts.past && "opacity-60",
      )}
    >
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-xs text-muted">{parts.past ? "已过去" : "还有"}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="clock-digits text-4xl font-semibold leading-none text-foreground sm:text-5xl">
            {value}
          </span>
          <span className="text-sm text-muted">{unit}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-foreground">{countdown.title}</span>
        <span className="clock-digits text-xs text-muted">
          {formatTargetAt(countdown.targetAt)}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <label
          className="flex items-center justify-between gap-2 rounded-field bg-default px-2.5 py-1.5 sm:justify-start"
          title="在沉浸界面展示"
        >
          <span className="text-xs text-muted">沉浸展示</span>
          <ToggleSwitch
            label={`${countdown.title} 在沉浸界面展示`}
            isSelected={countdown.showInImmersive}
            onChange={(next) => onToggleImmersive(countdown, next)}
          />
        </label>

        {/* 手机上一行放不下按钮加开关，这两个排成两列铺满 */}
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2.5">
          <Button size="sm" variant="ghost" onPress={() => onEdit(countdown)}>
            <Pencil className="size-3.5" />
            编辑
          </Button>
          <Button size="sm" variant="danger-soft" onPress={() => onDelete(countdown)}>
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </div>
      </div>
    </li>
  );
}
