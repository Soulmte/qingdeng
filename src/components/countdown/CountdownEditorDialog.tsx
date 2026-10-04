import { useEffect, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Dialog } from "@/components/ui/Dialog";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import {
  DEFAULT_TARGET_TIME,
  defaultTargetDate,
  formatTimeInput,
  fromDateTimeInput,
} from "@/lib/countdown";
import { toDateKey } from "@/lib/time";
import type { CountdownDraft, CountdownRecord } from "@/lib/types";

interface CountdownEditorDialogProps {
  open: boolean;
  /** null 表示新建 */
  countdown: CountdownRecord | null;
  /** 新建时的默认目标（通常是明天 00:00） */
  now: Date;
  layer?: 1 | 2;
  onClose: () => void;
  onSubmit: (draft: CountdownDraft) => Promise<void>;
}

interface FormState {
  title: string;
  date: string;
  time: string;
  showInImmersive: boolean;
}

function draftOf(countdown: CountdownRecord | null, now: Date): FormState {
  if (!countdown) {
    return {
      title: "",
      date: defaultTargetDate(now),
      time: DEFAULT_TARGET_TIME,
      showInImmersive: true,
    };
  }
  const target = new Date(countdown.targetAt);
  return {
    title: countdown.title,
    date: toDateKey(target),
    time: formatTimeInput(target),
    showInImmersive: countdown.showInImmersive,
  };
}

/** 原生日期与时间输入：手机上直接唤起系统选择器，时刻精确到分钟 */
const FIELD_CLASSES =
  "h-10 w-full rounded-field border border-[var(--field-border)] bg-[var(--field-background)] px-3 text-sm text-[var(--field-foreground)] pointer-coarse:h-11";

/** 新建 / 编辑倒计时：名称、日期、时刻，以及是否在沉浸界面一并显示 */
export function CountdownEditorDialog({
  open,
  countdown,
  now,
  layer = 1,
  onClose,
  onSubmit,
}: CountdownEditorDialogProps) {
  const [form, setForm] = useState<FormState>(() => draftOf(countdown, now));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(draftOf(countdown, now));
  }, [open, countdown, now]);

  const targetAt = fromDateTimeInput(form.date, form.time);
  const canSave = form.title.trim().length > 0 && targetAt !== null && !saving;

  const submit = async () => {
    if (!canSave || !targetAt) return;
    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        targetAt,
        showInImmersive: form.showInImmersive,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      layer={layer}
      title={countdown ? "编辑倒计时" : "新建倒计时"}
      description="写下一个日子，随时看还剩多少天"
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            取消
          </Button>
          <Button variant="primary" isDisabled={!canSave} onPress={submit}>
            {saving ? "保存中" : "保存"}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">名称</span>
        <Input
          value={form.title}
          maxLength={20}
          placeholder="例如：考研"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">日期</span>
          <input
            type="date"
            aria-label="目标日期"
            className={FIELD_CLASSES}
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">时刻</span>
          <input
            type="time"
            aria-label="目标时刻"
            className={FIELD_CLASSES}
            value={form.time}
            onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        天数按日历天算，每天零点翻页。时刻决定这一天里从什么时候算「到了」，默认到当天结束。
      </p>

      <div className="flex items-center justify-between gap-4 rounded-field bg-default px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">在沉浸界面展示</span>
          <span className="text-xs text-muted">开启后，沉浸模式里会一并显示还剩多少天</span>
        </div>
        <ToggleSwitch
          label="在沉浸界面展示"
          isSelected={form.showInImmersive}
          onChange={(showInImmersive) => setForm((prev) => ({ ...prev, showInImmersive }))}
        />
      </div>
    </Dialog>
  );
}
