import { NumberStepper } from "@/components/ui/NumberStepper";
import {
  DURATION_MAX_HOURS,
  DURATION_MAX_MINUTES,
  DURATION_MAX_SECONDS,
  DURATION_MINUTE_STEP,
} from "@/lib/presetEditor";

interface DurationFieldProps {
  seconds: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}

function totalLabel(hours: number, minutes: number, seconds: number) {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分`);
  if (seconds > 0) parts.push(`${seconds} 秒`);
  return parts.length > 0 ? parts.join(" ") : "0 分";
}

/** 时 / 分 / 秒三段步进：长时长（如 1 小时 30 分）不用自己换算成分钟 */
export function DurationField({ seconds, onChange, disabled }: DurationFieldProps) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const compose = (nextHours: number, nextMinutes: number, nextSeconds: number) =>
    onChange(nextHours * 3600 + nextMinutes * 60 + nextSeconds);

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <NumberStepper
        ariaLabel="小时"
        label="时"
        value={hours}
        min={0}
        max={DURATION_MAX_HOURS}
        step={1}
        disabled={disabled}
        className="w-28"
        onChange={(next) => compose(next, minutes, rest)}
      />
      <NumberStepper
        ariaLabel="分钟"
        label="分"
        value={minutes}
        min={0}
        max={DURATION_MAX_MINUTES}
        step={DURATION_MINUTE_STEP}
        disabled={disabled}
        className="w-28"
        onChange={(next) => compose(hours, next, rest)}
      />
      <NumberStepper
        ariaLabel="秒"
        label="秒"
        value={rest}
        min={0}
        max={DURATION_MAX_SECONDS}
        step={DURATION_MINUTE_STEP}
        disabled={disabled}
        className="w-28"
        onChange={(next) => compose(hours, minutes, next)}
      />
      <span className="pb-2 text-sm text-muted">合计 {totalLabel(hours, minutes, rest)}</span>
    </div>
  );
}
