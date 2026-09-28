import { useEffect, useState } from "react";
import { Button, Input, Switch } from "@heroui/react";
import { Coffee, Zap } from "lucide-react";
import { FOCUS_QUICK_MINUTES, describePresetCycle } from "@/lib/presetEditor";
import type { PresetDraft, TimerKind, TimerPreset } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DurationField } from "./DurationField";

interface PresetEditorDialogProps {
  open: boolean;
  preset: TimerPreset | null;
  layer?: 1 | 2;
  onClose: () => void;
  onSubmit: (draft: PresetDraft) => Promise<void>;
}

const DEFAULT_SHORT_BREAK = 5 * 60;
const DEFAULT_LONG_BREAK = 15 * 60;
const MAX_ROUNDS = 24;

function draftOf(preset: TimerPreset | null): PresetDraft {
  if (!preset) {
    return {
      name: "我的专注模板",
      kind: "countdown",
      focusSeconds: 30 * 60,
      shortBreakSeconds: DEFAULT_SHORT_BREAK,
      longBreakSeconds: 20 * 60,
      roundsPerSet: 3,
      autoStartNext: false,
    };
  }
  return {
    name: preset.name,
    kind: preset.kind,
    focusSeconds: preset.focusSeconds,
    shortBreakSeconds: preset.shortBreakSeconds,
    longBreakSeconds: preset.longBreakSeconds,
    roundsPerSet: preset.roundsPerSet,
    autoStartNext: preset.autoStartNext,
  };
}

/**
 * 新建 / 编辑自定义模板。
 * 先用两个按钮定下「排不排休息」，再填具体时长；
 * 轮次在两种模式下都有意义，所以始终可改：
 * 排休息时表示「每几轮进入长休息」，不排休息时表示「连续完成几段后结束」。
 */
export function PresetEditorDialog({
  open,
  preset,
  layer = 1,
  onClose,
  onSubmit,
}: PresetEditorDialogProps) {
  const [draft, setDraft] = useState<PresetDraft>(() => draftOf(preset));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(draftOf(preset));
    setError(null);
  }, [open, preset]);

  const patch = (partial: Partial<PresetDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

  const countdown = draft.kind === "countdown";
  const hasBreaks = draft.shortBreakSeconds > 0 || draft.longBreakSeconds > 0;
  const multiRound = draft.roundsPerSet > 1;
  const invalid = draft.name.trim().length === 0 || (countdown && draft.focusSeconds <= 0);

  const setBreaks = (next: boolean) => {
    if (next) {
      patch({
        shortBreakSeconds: draft.shortBreakSeconds > 0 ? draft.shortBreakSeconds : DEFAULT_SHORT_BREAK,
        longBreakSeconds: draft.longBreakSeconds > 0 ? draft.longBreakSeconds : DEFAULT_LONG_BREAK,
      });
      return;
    }
    patch({ shortBreakSeconds: 0, longBreakSeconds: 0 });
  };

  const submit = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await onSubmit({ ...draft, name: draft.name.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      layer={layer}
      title={preset && preset.id > 0 ? "编辑模板" : "新建模板"}
      description="模板会保存在本机，可随时切换使用"
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            取消
          </Button>
          <Button variant="primary" isDisabled={invalid || saving} onPress={submit}>
            {saving ? "保存中" : "保存模板"}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">模板名称</span>
        <Input
          value={draft.name}
          maxLength={20}
          placeholder="例如：早读冲刺"
          onChange={(event) => patch({ name: event.target.value })}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">计时方式</span>
        <SegmentedControl<TimerKind>
          value={draft.kind}
          onChange={(kind) => patch({ kind })}
          options={[
            { value: "countdown", label: "倒计时" },
            { value: "countup", label: "正计时" },
          ]}
        />
      </div>

      {countdown ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">专注时长</span>
            <DurationField
              seconds={draft.focusSeconds}
              onChange={(focusSeconds) => patch({ focusSeconds })}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">常用</span>
              {FOCUS_QUICK_MINUTES.map((minutes) => (
                <Button
                  key={minutes}
                  size="sm"
                  variant={draft.focusSeconds === minutes * 60 ? "primary" : "tertiary"}
                  onPress={() => patch({ focusSeconds: minutes * 60 })}
                >
                  {minutes} 分
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">这个模板要排休息吗</span>
            <SegmentedControl<"with" | "without">
              value={hasBreaks ? "with" : "without"}
              onChange={(value) => setBreaks(value === "with")}
              options={[
                { value: "with", label: "排休息", icon: Coffee },
                { value: "without", label: "不排休息", icon: Zap },
              ]}
            />
          </div>

          {hasBreaks ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted">短休息</span>
                <DurationField
                  seconds={draft.shortBreakSeconds}
                  onChange={(shortBreakSeconds) => patch({ shortBreakSeconds })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted">长休息</span>
                <DurationField
                  seconds={draft.longBreakSeconds}
                  onChange={(longBreakSeconds) => patch({ longBreakSeconds })}
                />
              </div>
            </>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <NumberStepper
              ariaLabel={hasBreaks ? "每几轮专注进入长休息" : "连续完成几段专注"}
              label={hasBreaks ? "每几轮专注进入长休息" : "连续完成几段专注后结束"}
              hint={
                hasBreaks
                  ? `每完成 ${draft.roundsPerSet} 轮专注安排一次长休息`
                  : multiRound
                    ? `做满 ${draft.roundsPerSet} 段才结束，段与段之间不休息`
                    : "做满这一段就结束"
              }
              testId="rounds"
              value={draft.roundsPerSet}
              min={1}
              max={MAX_ROUNDS}
              className="w-32"
              onChange={(roundsPerSet) => patch({ roundsPerSet })}
            />
            <Switch
              aria-label="阶段结束后自动开始下一段"
              isSelected={draft.autoStartNext}
              onChange={(autoStartNext) => patch({ autoStartNext })}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span className="text-sm text-foreground">阶段结束后自动开始下一段</span>
              </Switch.Content>
            </Switch>
          </div>
        </>
      ) : (
        <p className="rounded-field bg-default px-3.5 py-3 text-xs leading-relaxed text-muted">
          正计时只累计投入时间，不设总时长也不排休息，适合记录一整段学习。
        </p>
      )}

      <div className="flex flex-col gap-1 rounded-field border border-foreground/10 bg-surface-secondary px-3.5 py-3">
        <span className="text-xs font-medium text-foreground">运行效果</span>
        <span className="text-xs leading-relaxed text-muted">{describePresetCycle(draft)}</span>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </Dialog>
  );
}
