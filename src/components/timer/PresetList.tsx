import { Button, Chip } from "@heroui/react";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { describeBreaks, PHASE_LABELS } from "@/lib/presets";
import { formatDurationLabel } from "@/lib/time";
import type { TimerPreset } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PresetListProps {
  presets: TimerPreset[];
  selectedId: number;
  onSelect: (preset: TimerPreset) => void;
  disabled?: boolean;
  onEdit?: (preset: TimerPreset) => void;
  onDuplicate?: (preset: TimerPreset) => void;
  onDelete?: (preset: TimerPreset) => void;
}

/** 模板选择列表：选中区与操作区分离，避免按钮嵌套 */
export function PresetList({
  presets,
  selectedId,
  onSelect,
  disabled,
  onEdit,
  onDuplicate,
  onDelete,
}: PresetListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {presets.map((preset) => {
        const selected = preset.id === selectedId;
        const hasActions = Boolean(onDuplicate || (!preset.isBuiltin && (onEdit || onDelete)));

        return (
          <li
            key={preset.id}
            className={cn(
              "flex flex-col rounded-field border transition-colors",
              selected ? "border-accent bg-accent-soft" : "border-foreground/10 bg-surface",
            )}
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSelect(preset)}
              className={cn(
                "flex cursor-[var(--cursor-interactive)] flex-col gap-2 p-3.5 text-left",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{preset.name}</span>
                {selected ? <Check className="size-4 shrink-0 text-accent" /> : null}
              </div>

              <span className="text-xs leading-relaxed text-muted">{preset.summary}</span>

              <div className="flex flex-wrap items-center gap-1.5">
                <Chip size="sm" color="accent">
                  {preset.kind === "countup"
                    ? "正计时"
                    : `${PHASE_LABELS.focus} ${formatDurationLabel(preset.focusSeconds)}`}
                </Chip>
                <Chip size="sm" color="default">
                  休息 {describeBreaks(preset)}
                </Chip>
                {preset.isBuiltin ? null : (
                  <Chip size="sm" color="warning">
                    自定义
                  </Chip>
                )}
              </div>
            </button>

            {hasActions ? (
              <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
                {onDuplicate ? (
                  <Button size="sm" variant="ghost" onPress={() => onDuplicate(preset)}>
                    <Copy className="size-3.5" />
                    复制
                  </Button>
                ) : null}
                {!preset.isBuiltin && onEdit ? (
                  <Button size="sm" variant="ghost" onPress={() => onEdit(preset)}>
                    <Pencil className="size-3.5" />
                    编辑
                  </Button>
                ) : null}
                {!preset.isBuiltin && onDelete ? (
                  <Button size="sm" variant="danger-soft" onPress={() => onDelete(preset)}>
                    <Trash2 className="size-3.5" />
                    删除
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
