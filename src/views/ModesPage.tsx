import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Chip } from "@heroui/react";
import { Copy, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { PresetManagerDialogs } from "@/components/timer/PresetManagerDialogs";
import { usePresetManager } from "@/hooks/usePresetManager";
import { describeBreaks, mergePresets } from "@/lib/presets";
import { formatDurationLabel } from "@/lib/time";
import type { TimerPreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePresetStore } from "@/stores/presetStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";

const BUILTIN_HINTS: Record<number, string> = {
  [-1]: "经典节奏",
  [-2]: "长时间专注",
  [-3]: "学习与休息交替",
  [-4]: "单段倒计时",
  [-5]: "只累计时长",
};

function durationRows(preset: TimerPreset) {
  return [
    {
      label: "专注",
      value: preset.kind === "countup" ? "手动结束" : formatDurationLabel(preset.focusSeconds),
    },
    {
      label: "短休息",
      value: preset.shortBreakSeconds > 0 ? formatDurationLabel(preset.shortBreakSeconds) : "无",
    },
    {
      label: "长休息",
      value: preset.longBreakSeconds > 0 ? formatDurationLabel(preset.longBreakSeconds) : "无",
    },
    {
      label: "轮次",
      value: preset.kind === "countup" ? "不限" : `每 ${preset.roundsPerSet} 轮长休息`,
    },
  ];
}

export default function ModesPage() {
  const customPresets = usePresetStore((state) => state.custom);
  const currentPreset = useTimerStore((state) => state.preset);
  const selectPreset = useTimerStore((state) => state.selectPreset);
  const updateSettings = useSettingsStore((state) => state.update);
  const navigate = useNavigate();

  const presets = useMemo(() => mergePresets(customPresets), [customPresets]);

  const manager = usePresetManager({
    onDeleted: (removed) => {
      if (currentPreset.id !== removed.id) return;
      const fallback = presets.find((item) => item.isBuiltin) ?? presets[0];
      selectPreset(fallback);
      updateSettings({ lastPresetId: fallback.id });
    },
  });

  const applyPreset = (preset: TimerPreset) => {
    selectPreset(preset);
    updateSettings({ lastPresetId: preset.id });
    navigate("/");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">计时模式</h1>
          <p className="text-sm text-muted">
            考试模式、学习休息等常用方案已内置，也可以按自己的节奏新建模板
          </p>
        </div>
        <Button variant="primary" onPress={manager.openCreate}>
          <Plus className="size-4" />
          新建模板
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {presets.map((preset) => {
          const active = preset.id === currentPreset.id;
          return (
            <Card.Root
              key={preset.id}
              className={cn("transition-shadow", active && "ring-2 ring-accent")}
            >
              <Card.Header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{preset.name}</h2>
                  <div className="flex items-center gap-1.5">
                    {active ? (
                      <Chip size="sm" color="accent">
                        使用中
                      </Chip>
                    ) : null}
                    <Chip size="sm" color={preset.isBuiltin ? "default" : "warning"}>
                      {preset.isBuiltin ? "内置" : "自定义"}
                    </Chip>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted">{preset.summary}</p>
              </Card.Header>

              <Card.Content className="flex flex-col gap-3">
                <dl className="grid grid-cols-2 gap-3">
                  {durationRows(preset).map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-0.5 rounded-field bg-default px-3 py-2"
                    >
                      <dt className="text-[0.7rem] text-muted">{row.label}</dt>
                      <dd className="text-xs font-medium text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap gap-1.5">
                  <Chip size="sm" color="default">
                    休息方案 {describeBreaks(preset)}
                  </Chip>
                  <Chip size="sm" color={preset.autoStartNext ? "success" : "default"}>
                    {preset.autoStartNext ? "自动接续" : "手动开始"}
                  </Chip>
                  {preset.isBuiltin ? (
                    <Chip size="sm" color="default">
                      {BUILTIN_HINTS[preset.id] ?? "预设"}
                    </Chip>
                  ) : null}
                </div>
              </Card.Content>

              <Card.Footer className="flex-wrap gap-2">
                <Button size="sm" variant="primary" onPress={() => applyPreset(preset)}>
                  <Play className="size-4" />
                  使用
                </Button>
                <Button size="sm" variant="secondary" onPress={() => manager.openDuplicate(preset)}>
                  <Copy className="size-4" />
                  复制
                </Button>
                {preset.isBuiltin ? null : (
                  <>
                    <Button size="sm" variant="ghost" onPress={() => manager.openEdit(preset)}>
                      <Pencil className="size-4" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() => manager.requestDelete(preset)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </>
                )}
              </Card.Footer>
            </Card.Root>
          );
        })}
      </div>

      <PresetManagerDialogs manager={manager} />
    </div>
  );
}
