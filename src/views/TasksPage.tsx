import { useMemo, useState } from "react";
import { Button, Card, Input } from "@heroui/react";
import { Plus } from "lucide-react";
import { TaskEditorDialog } from "@/components/task/TaskEditorDialog";
import { TaskRow } from "@/components/task/TaskRow";
import { Dialog } from "@/components/ui/Dialog";
import { NumberStepper } from "@/components/ui/NumberStepper";
import type { TaskRecord } from "@/lib/types";
import { useTaskStore } from "@/stores/taskStore";
import { useTimerStore } from "@/stores/timerStore";

export default function TasksPage() {
  const tasks = useTaskStore((state) => state.tasks);
  const createTask = useTaskStore((state) => state.create);
  const renameTask = useTaskStore((state) => state.rename);
  const setStatus = useTaskStore((state) => state.setStatus);
  const removeTask = useTaskStore((state) => state.remove);
  const currentTaskId = useTimerStore((state) => state.taskId);
  const setTask = useTimerStore((state) => state.setTask);

  const [title, setTitle] = useState("");
  const [estimateRounds, setEstimateRounds] = useState(2);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaskRecord | null>(null);

  const openTasks = useMemo(() => tasks.filter((task) => task.status === "open"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === "done"), [tasks]);
  const plannedRounds = openTasks.reduce((sum, task) => sum + task.estimateRounds, 0);
  const finishedRounds = openTasks.reduce((sum, task) => sum + task.doneRounds, 0);

  const addQuick = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createTask({ title: trimmed, note: "", estimateRounds });
      setTitle("");
      setEstimateRounds(2);
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (task: TaskRecord) => {
    const nextDone = task.status !== "done";
    await setStatus(task.id, nextDone);
    if (nextDone && task.id === currentTaskId) setTask(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeTask(pendingDelete.id);
    if (pendingDelete.id === currentTaskId) setTask(null);
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">任务清单</h1>
          <p className="text-sm text-muted">
            写下要做的事与预估段数，关联计时后进度会自动累计
          </p>
        </div>
        <span className="text-sm text-muted">
          进行中 {openTasks.length} 项 · 已完成 {finishedRounds} / {plannedRounds} 段
        </span>
      </header>

      {/* 添加栏：一整行，回车即保存 */}
      <div className="flex flex-row flex-wrap items-center gap-3 rounded-field border border-foreground/10 bg-surface p-3">
        <Input
          value={title}
          maxLength={40}
          aria-label="任务标题"
          placeholder="添加一个任务，回车即可保存"
          className="min-w-[240px] flex-1"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addQuick();
          }}
        />
        <div className="flex flex-row items-center gap-2">
          <span className="text-xs text-muted">预估</span>
          <NumberStepper
            ariaLabel="预估段数"
            value={estimateRounds}
            min={1}
            max={40}
            className="w-28"
            onChange={setEstimateRounds}
          />
          <span className="text-xs text-muted">段</span>
        </div>
        <Button variant="primary" isDisabled={!title.trim() || creating} onPress={addQuick}>
          <Plus className="size-4" />
          添加
        </Button>
      </div>

      <Card.Root>
        <Card.Header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">进行中</span>
          <span className="text-xs text-muted">
            设为当前任务后，计时页记录的专注段会算到它身上
          </span>
        </Card.Header>
        <Card.Content>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted">还没有进行中的任务，先在上方添加一个吧。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {openTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isCurrent={task.id === currentTaskId}
                  onSetCurrent={(next) => setTask({ id: next.id, title: next.title })}
                  onEdit={setEditing}
                  onToggleStatus={toggleStatus}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          )}
        </Card.Content>
      </Card.Root>

      {doneTasks.length > 0 ? (
        <Card.Root variant="secondary">
          <Card.Header className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">已完成</span>
            <span className="text-xs text-muted">记录会保留，可以随时恢复或删除</span>
          </Card.Header>
          <Card.Content>
            <ul className="flex flex-col gap-2">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isCurrent={false}
                  onEdit={setEditing}
                  onToggleStatus={toggleStatus}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          </Card.Content>
        </Card.Root>
      ) : null}

      <TaskEditorDialog
        open={editing !== null}
        task={editing}
        layer={2}
        onClose={() => setEditing(null)}
        onSubmit={async (draft) => {
          if (editing) await renameTask(editing.id, draft);
        }}
      />

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        layer={2}
        title="删除任务"
        description="计时记录不会被删除，只是不再关联到这个任务"
        footer={
          <>
            <Button variant="ghost" onPress={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button variant="danger" onPress={confirmDelete}>
              删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">确认删除「{pendingDelete?.title}」吗？</p>
      </Dialog>
    </div>
  );
}
