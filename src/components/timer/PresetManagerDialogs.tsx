import { Button } from "@heroui/react";
import type { PresetManager } from "@/hooks/usePresetManager";
import { Dialog } from "@/components/ui/Dialog";
import { PresetEditorDialog } from "./PresetEditorDialog";

/** 模板编辑与删除确认两个弹层，计时页与模式页共用 */
export function PresetManagerDialogs({
  manager,
  layer = 1,
}: {
  manager: PresetManager;
  layer?: 1 | 2;
}) {
  return (
    <>
      <PresetEditorDialog
        open={manager.editorOpen}
        preset={manager.editing}
        layer={layer}
        onClose={manager.closeEditor}
        onSubmit={manager.submit}
      />

      <Dialog
        open={manager.pendingDelete !== null}
        onClose={manager.cancelDelete}
        layer={layer}
        title="删除自定义模板"
        description="已经记录的计时数据不会受到影响"
        footer={
          <>
            <Button variant="ghost" onPress={manager.cancelDelete}>
              取消
            </Button>
            <Button variant="danger" onPress={manager.confirmDelete}>
              删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">确认删除「{manager.pendingDelete?.name}」吗？</p>
      </Dialog>
    </>
  );
}
