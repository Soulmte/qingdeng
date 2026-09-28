import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** 窄屏只留图标：手机上三个带文字的选项会占掉一整行 */
  compact?: boolean;
  className?: string;
}

/** 少量互斥选项的切换控件，比下拉更直观 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  compact,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-1 rounded-field bg-default p-1",
        disabled && "status-disabled",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex cursor-[var(--cursor-interactive)] items-center gap-1.5 rounded-[calc(var(--radius)*1.1)] px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            <span className={cn(compact && "hidden sm:inline")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
