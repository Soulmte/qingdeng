import { Button, Chip, ProgressBar } from "@heroui/react";
import { Check, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import { formatRecordTime } from "@/lib/time";
import type { TaskRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  task: TaskRecord;
  isCurrent: boolean;
  disabled?: boolean;
  onSetCurrent?: (task: TaskRecord) => void;
  onEdit?: (task: TaskRecord) => void;
  onToggleStatus?: (task: TaskRecord) => void;
  onDelete?: (task: TaskRecord) => void;
}

/** 任务列表的一行：左侧进度，右侧操作 */
export function TaskRow({
  task,
  isCurrent,
  disabled,
  onSetCurrent,
  onEdit,
  onToggleStatus,
  onDelete,
}: TaskRowProps) {
  const done = task.status === "done";
  const percent = Math.min(100, Math.round((task.doneRounds / Math.max(1, task.estimateRounds)) * 100));

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-field border p-3.5 transition-colors",
        isCurrent ? "border-accent bg-accent-soft" : "border-foreground/10 bg-surface",
        done && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold text-foreground",
                done && "line-through decoration-1",
              )}
            >
              {task.title}
            </span>
            {isCurrent ? (
              <Chip size="sm" color="accent">
                当前任务
              </Chip>
            ) : null}
            {done ? (
              <Chip size="sm" color="success">
                已完成
              </Chip>
            ) : null}
          </div>
          {task.note ? <span className="text-xs text-muted">{task.note}</span> : null}
          {done && task.completedAt ? (
            <span className="text-xs text-muted">完成于 {formatRecordTime(task.completedAt)}</span>
          ) : null}
        </div>

        <span className="clock-digits shrink-0 text-sm text-muted">
          {task.doneRounds} / {task.estimateRounds} 段
        </span>
      </div>

      <ProgressBar value={percent} aria-label={`${task.title} 完成进度`}>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <div className="flex flex-wrap gap-1.5">
        {!done && onSetCurrent && !isCurrent ? (
          <Button size="sm" variant="primary" isDisabled={disabled} onPress={() => onSetCurrent(task)}>
            <Play className="size-3.5" />
            设为当前
          </Button>
        ) : null}
        {onEdit ? (
          <Button size="sm" variant="ghost" onPress={() => onEdit(task)}>
            <Pencil className="size-3.5" />
            编辑
          </Button>
        ) : null}
        {onToggleStatus ? (
          <Button size="sm" variant="ghost" onPress={() => onToggleStatus(task)}>
            {done ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            {done ? "恢复" : "完成"}
          </Button>
        ) : null}
        {onDelete ? (
          <Button size="sm" variant="danger-soft" onPress={() => onDelete(task)}>
            <Trash2 className="size-3.5" />
            删除
          </Button>
        ) : null}
      </div>
    </li>
  );
}
