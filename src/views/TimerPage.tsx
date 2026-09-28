import { useState } from "react";
import { Button } from "@heroui/react";
import {
  AlignLeft,
  ChevronDown,
  CircleDashed,
  LayoutGrid,
  SquareStack,
  Target,
} from "lucide-react";
import { ClockFaceView } from "@/components/clock/ClockFaceView";
import { RoundTrack } from "@/components/timer/RoundTrack";
import { TaskPickerDialog } from "@/components/timer/TaskPickerDialog";
import { TemplateDialog } from "@/components/timer/TemplateDialog";
import { TimerControls } from "@/components/timer/TimerControls";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useClockView } from "@/hooks/useClockView";
import type { ClockFace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";

const FACE_OPTIONS = [
  { value: "ring" as ClockFace, label: "圆环", icon: CircleDashed },
  { value: "flip" as ClockFace, label: "翻页", icon: SquareStack },
  { value: "plain" as ClockFace, label: "常态", icon: AlignLeft },
];

export default function TimerPage() {
  const clockFace = useSettingsStore((state) => state.clockFace);
  const updateSettings = useSettingsStore((state) => state.update);
  const preset = useTimerStore((state) => state.preset);
  const taskId = useTimerStore((state) => state.taskId);
  const taskName = useTimerStore((state) => state.taskName);
  const clock = useClockView();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col gap-5 md:gap-6">
      {/*
        手机上标题栏折成两行：第一行两个入口按钮平分宽度，
        第二行是轮次指示与时钟形态，否则三个按钮 + 轮次点会挤成三行。
      */}
      <header className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-5">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="min-w-0 flex-1 md:flex-none"
            onPress={() => setTemplatesOpen(true)}
          >
            <LayoutGrid className="size-4 shrink-0" />
            <span className="truncate">{preset.name}</span>
            <ChevronDown className="size-4 shrink-0" />
          </Button>

          <Button
            variant="outline"
            className="min-w-0 flex-1 md:flex-none"
            onPress={() => setTaskPickerOpen(true)}
          >
            <Target className={cn("size-4 shrink-0", taskId !== null && "text-accent")} />
            <span className={cn("truncate md:max-w-[200px]", !taskName && "text-muted")}>
              {taskName || "关联任务"}
            </span>
            <ChevronDown className="size-4 shrink-0" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:gap-2">
          <RoundTrack />
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted md:inline">时钟形态</span>
            <SegmentedControl<ClockFace>
              value={clockFace}
              onChange={(face) => updateSettings({ clockFace: face })}
              options={FACE_OPTIONS}
              compact
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-2 md:gap-8 md:py-4">
        <ClockFaceView face={clockFace} {...clock} />
        <TimerControls />
      </div>

      <TemplateDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <TaskPickerDialog open={taskPickerOpen} onClose={() => setTaskPickerOpen(false)} />
    </div>
  );
}
