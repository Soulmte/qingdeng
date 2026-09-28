import { useEffect, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Dialog } from "@/components/ui/Dialog";
import { NumberStepper } from "@/components/ui/NumberStepper";
import type { TaskRecord } from "@/lib/types";

export interface TaskDraft {
  title: string;
  note: string;
  estimateRounds: number;
}

interface TaskEditorDialogProps {
  open: boolean;
  task: TaskRecord | null;
  layer?: 1 | 2;
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => Promise<void>;
}

function draftOf(task: TaskRecord | null): TaskDraft {
  return {
    title: task?.title ?? "",
    note: task?.note ?? "",
    estimateRounds: task?.estimateRounds ?? 2,
  };
}

/** 新建 / 编辑任务：标题、备注、预估需要几段专注 */
export function TaskEditorDialog({ open, task, layer = 1, onClose, onSubmit }: TaskEditorDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => draftOf(task));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftOf(task));
  }, [open, task]);

  const submit = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ ...draft, title: draft.title.trim(), note: draft.note.trim() });
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
      title={task ? "编辑任务" : "新建任务"}
      description="预估段数用来衡量任务规模，实际完成段数由计时记录自动累计"
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            取消
          </Button>
          <Button variant="primary" isDisabled={!draft.title.trim() || saving} onPress={submit}>
            {saving ? "保存中" : "保存"}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">任务标题</span>
        <Input
          value={draft.title}
          maxLength={40}
          placeholder="例如：完成第三章初稿"
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">备注</span>
        <Input
          value={draft.note}
          maxLength={60}
          placeholder="可选，用来记录范围或下一步"
          onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
        />
      </label>

      <NumberStepper
        ariaLabel="预估段数"
        label="预估需要几段专注"
        value={draft.estimateRounds}
        min={1}
        max={40}
        className="w-36"
        onChange={(estimateRounds) => setDraft((prev) => ({ ...prev, estimateRounds }))}
      />
    </Dialog>
  );
}
