import { useMemo, useState } from "react";
import { Button, Card } from "@heroui/react";
import { Plus } from "lucide-react";
import { CountdownEditorDialog } from "@/components/countdown/CountdownEditorDialog";
import { CountdownRow } from "@/components/countdown/CountdownRow";
import { Dialog } from "@/components/ui/Dialog";
import { useNow } from "@/hooks/useNow";
import { countdownParts } from "@/lib/countdown";
import type { CountdownDraft, CountdownRecord } from "@/lib/types";
import { useCountdownStore } from "@/stores/countdownStore";

export default function CountdownsPage() {
  const countdowns = useCountdownStore((state) => state.countdowns);
  const create = useCountdownStore((state) => state.create);
  const update = useCountdownStore((state) => state.update);
  const remove = useCountdownStore((state) => state.remove);
  const setShowInImmersive = useCountdownStore((state) => state.setShowInImmersive);

  // 分钟级的展示，每 30 秒对一次表就够了，不必逐秒重排
  const now = useNow(30_000);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CountdownRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CountdownRecord | null>(null);

  // 还没到的排前面，由近到远；已经过去的沉到最后，免得占着视线
  const ordered = useMemo(() => {
    const nowMs = now.getTime();
    const distance = (item: CountdownRecord) => new Date(item.targetAt).getTime() - nowMs;
    return [...countdowns].sort((a, b) => {
      const left = distance(a);
      const right = distance(b);
      if (left >= 0 && right >= 0) return left - right;
      if (left >= 0) return -1;
      if (right >= 0) return 1;
      return right - left;
    });
  }, [countdowns, now]);

  const upcoming = ordered.filter((item) => !countdownParts(item.targetAt, now).past).length;

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (countdown: CountdownRecord) => {
    setEditing(countdown);
    setEditorOpen(true);
  };

  const submit = async (draft: CountdownDraft) => {
    if (editing) await update(editing.id, draft);
    else await create(draft);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await remove(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">倒计时</h1>
          <p className="text-sm text-muted">
            写下一个日子，随时看还剩多少天。每条都可以单独选择是否在沉浸界面一并显示
          </p>
        </div>
        <Button variant="primary" onPress={openCreate}>
          <Plus className="size-4" />
          新建倒计时
        </Button>
      </header>

      <Card.Root>
        <Card.Header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">全部倒计时</span>
          <span className="text-xs text-muted">
            {countdowns.length === 0
              ? "还没有倒计时"
              : `共 ${countdowns.length} 条，${upcoming} 条还没到`}
          </span>
        </Card.Header>
        <Card.Content>
          {ordered.length === 0 ? (
            <p className="text-sm text-muted">
              还没有倒计时。写下一个日子吧，例如考研、答辩、出发的那天。
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {ordered.map((countdown) => (
                <CountdownRow
                  key={countdown.id}
                  countdown={countdown}
                  now={now}
                  onEdit={openEdit}
                  onDelete={setPendingDelete}
                  onToggleImmersive={(item, next) => void setShowInImmersive(item.id, next)}
                />
              ))}
            </ul>
          )}
        </Card.Content>
      </Card.Root>

      {ordered.length > 0 ? (
        <p className="text-xs text-muted">
          天数按日历天算，每天零点翻页；到了目标这一天，会精确到还剩几小时几分。
        </p>
      ) : null}

      <CountdownEditorDialog
        open={editorOpen}
        countdown={editing}
        now={now}
        onClose={() => setEditorOpen(false)}
        onSubmit={submit}
      />

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        layer={2}
        title="删除倒计时"
        description="只是不再显示这条，不影响计时记录"
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
