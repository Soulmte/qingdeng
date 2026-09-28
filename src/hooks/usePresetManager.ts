import { useState } from "react";
import type { TimerPreset } from "@/lib/types";
import { usePresetStore, type PresetDraft } from "@/stores/presetStore";

interface PresetManagerOptions {
  /** 删除成功后回调，方便页面把当前使用的模板切走 */
  onDeleted?: (preset: TimerPreset) => void;
}

/** 模板的新建 / 编辑 / 复制 / 删除流程，计时页与模式页共用 */
export function usePresetManager({ onDeleted }: PresetManagerOptions = {}) {
  const createPreset = usePresetStore((state) => state.create);
  const updatePreset = usePresetStore((state) => state.update);
  const removePreset = usePresetStore((state) => state.remove);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TimerPreset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TimerPreset | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (preset: TimerPreset) => {
    setEditing(preset);
    setEditorOpen(true);
  };

  const openDuplicate = (preset: TimerPreset) => {
    setEditing({ ...preset, id: 0, name: `${preset.name} 副本`, isBuiltin: false });
    setEditorOpen(true);
  };

  const submit = async (draft: PresetDraft) => {
    if (editing && editing.id > 0) await updatePreset(editing.id, draft);
    else await createPreset(draft);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const removed = pendingDelete;
    await removePreset(removed.id);
    setPendingDelete(null);
    onDeleted?.(removed);
  };

  return {
    editorOpen,
    editing,
    pendingDelete,
    openCreate,
    openEdit,
    openDuplicate,
    submit,
    closeEditor: () => setEditorOpen(false),
    requestDelete: setPendingDelete,
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
  };
}

export type PresetManager = ReturnType<typeof usePresetManager>;
