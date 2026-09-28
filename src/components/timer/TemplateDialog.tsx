import { useMemo } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { usePresetManager } from "@/hooks/usePresetManager";
import { mergePresets } from "@/lib/presets";
import type { TimerPreset } from "@/lib/types";
import { usePresetStore } from "@/stores/presetStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";
import { Dialog } from "@/components/ui/Dialog";
import { PresetList } from "./PresetList";
import { PresetManagerDialogs } from "./PresetManagerDialogs";
import { QuickStartPanel } from "./QuickStartPanel";

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

/** 首页的模板与时长入口：切换模板、管理自定义模板、直接用临时时长开始 */
export function TemplateDialog({ open, onClose }: TemplateDialogProps) {
  const customPresets = usePresetStore((state) => state.custom);
  const preset = useTimerStore((state) => state.preset);
  const status = useTimerStore((state) => state.status);
  const selectPreset = useTimerStore((state) => state.selectPreset);
  const updateSettings = useSettingsStore((state) => state.update);

  const presets = useMemo(() => mergePresets(customPresets), [customPresets]);
  const busy = status === "running" || status === "paused";

  const manager = usePresetManager({
    // 删除的正好是当前模板时，退回内置模板，避免留下一个不存在的选择
    onDeleted: (removed) => {
      if (preset.id !== removed.id) return;
      const fallback = presets.find((item) => item.isBuiltin) ?? presets[0];
      selectPreset(fallback);
      updateSettings({ lastPresetId: fallback.id });
    },
  });

  const apply = (next: TimerPreset) => {
    selectPreset(next);
    updateSettings({ lastPresetId: next.id });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="模板与时长"
      description="切换计时模板，或直接选一个临时时长开始"
      className="max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.15fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">计时模板</h3>
              <span className="text-xs text-muted">
                {busy ? "计时进行中，先暂停再切换" : "点击卡片即切换"}
              </span>
            </div>
            <Button size="sm" variant="outline" onPress={manager.openCreate}>
              <Plus className="size-4" />
              新建
            </Button>
          </div>

          <div className="max-h-[52vh] overflow-y-auto pr-1">
            <PresetList
              presets={presets}
              selectedId={preset.id}
              onSelect={apply}
              disabled={busy}
              onEdit={manager.openEdit}
              onDuplicate={manager.openDuplicate}
              onDelete={manager.requestDelete}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-foreground">快速开始</h3>
            <span className="text-xs text-muted">只用于这一次计时，不会保存成模板</span>
          </div>
          <QuickStartPanel dialogLayer={2} onStarted={onClose} />
        </section>
      </div>

      <PresetManagerDialogs manager={manager} layer={2} />
    </Dialog>
  );
}
