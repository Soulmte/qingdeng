import { useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Check, MinusCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { NumberStepper } from "@/components/ui/NumberStepper";
import type { TaskRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/stores/taskStore";
import { useTimerStore } from "@/stores/timerStore";

function TaskOption({
  title,
  meta,
  selected,
  onSelect,
}: {
  title: string;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex cursor-[var(--cursor-interactive)] items-center justify-between gap-3 rounded-field border p-3 text-left transition-colors",
        selected ? "border-accent bg-accent-soft" : "border-foreground/10 bg-surface hover:bg-default",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted">{meta}</span>
      </span>
      {selected ? <Check className="size-4 shrink-0 text-accent" /> : null}
    </button>
  );
}

/** 计时页的任务入口：选择当前任务，或直接新建一个 */
export function TaskPickerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tasks = useTaskStore((state) => state.tasks);
  const createTask = useTaskStore((state) => state.create);
  const currentTaskId = useTimerStore((state) => state.taskId);
  const setTask = useTimerStore((state) => state.setTask);

  const [title, setTitle] = useState("");
  const [estimateRounds, setEstimateRounds] = useState(1);
  const [creating, setCreating] = useState(false);

  const openTasks = useMemo(() => tasks.filter((task) => task.status === "open"), [tasks]);

  const choose = (task: TaskRecord | null) => {
    setTask(task ? { id: task.id, title: task.title } : null);
    onClose();
  };

  const addAndChoose = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createTask({ title: trimmed, note: "", estimateRounds });
      const created = useTaskStore
        .getState()
        .tasks.find((task) => task.status === "open" && task.title === trimmed);
      setTitle("");
      setEstimateRounds(1);
      if (created) choose(created);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="关联任务"
      description="这一段专注会累计到所选任务的进度上"
      className="max-w-lg"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted">快速新建</span>
          <Input
            value={title}
            maxLength={40}
            placeholder="任务标题"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addAndChoose();
            }}
          />
        </label>
        <NumberStepper
          ariaLabel="预估段数"
          label="预估段数"
          value={estimateRounds}
          min={1}
          max={40}
          className="w-28"
          onChange={setEstimateRounds}
        />
        <Button variant="outline" isDisabled={!title.trim() || creating} onPress={addAndChoose}>
          添加并选中
        </Button>
      </div>

      <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto pr-1">
        <TaskOption
          title="不关联任务"
          meta="只记录时间，不计入任何任务进度"
          selected={currentTaskId === null}
          onSelect={() => choose(null)}
        />
        {openTasks.map((task) => (
          <TaskOption
            key={task.id}
            title={task.title}
            meta={`已完成 ${task.doneRounds} / ${task.estimateRounds} 段`}
            selected={task.id === currentTaskId}
            onSelect={() => choose(task)}
          />
        ))}
      </div>

      {openTasks.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <MinusCircle className="size-3.5" />
          还没有进行中的任务，可以在上方直接新建。
        </p>
      ) : null}
    </Dialog>
  );
}
