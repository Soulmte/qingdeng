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
    <div className="flex min-h-full flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onPress={() => setTemplatesOpen(true)}>
            <LayoutGrid className="size-4" />
            {preset.name}
            <ChevronDown className="size-4" />
          </Button>

          <Button variant="outline" onPress={() => setTaskPickerOpen(true)}>
            <Target className={cn("size-4", taskId !== null && "text-accent")} />
            <span className={cn("max-w-[200px] truncate", !taskName && "text-muted")}>
              {taskName || "关联任务"}
            </span>
            <ChevronDown className="size-4" />
          </Button>

          <RoundTrack />
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-muted">时钟形态</span>
          <SegmentedControl<ClockFace>
            value={clockFace}
            onChange={(face) => updateSettings({ clockFace: face })}
            options={FACE_OPTIONS}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-4">
        <ClockFaceView face={clockFace} {...clock} />
        <TimerControls />
      </div>

      <TemplateDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <TaskPickerDialog open={taskPickerOpen} onClose={() => setTaskPickerOpen(false)} />
    </div>
  );
}
