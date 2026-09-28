import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import type { TimerKind } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DurationField } from "./DurationField";

interface CustomTimeDialogProps {
  open: boolean;
  onClose: () => void;
  layer?: 1 | 2;
  onConfirm: (seconds: number, kind: TimerKind) => void;
}

const DEFAULT_SECONDS = 25 * 60;

/** 自定义单次时间：只对本次生效，开始后不写入模板 */
export function CustomTimeDialog({ open, onClose, layer = 1, onConfirm }: CustomTimeDialogProps) {
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [kind, setKind] = useState<TimerKind>("countdown");

  useEffect(() => {
    if (!open) return;
    setSeconds(DEFAULT_SECONDS);
    setKind("countdown");
  }, [open]);

  const confirm = () => {
    onConfirm(kind === "countdown" ? seconds : 0, kind);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="自定义单次计时"
      description="只用于这一次计时，不会保存成模板"
      layer={layer}
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            isDisabled={kind === "countdown" && seconds <= 0}
            onPress={confirm}
          >
            开始计时
          </Button>
        </>
      }
    >
      <SegmentedControl<TimerKind>
        value={kind}
        onChange={setKind}
        options={[
          { value: "countdown", label: "倒计时" },
          { value: "countup", label: "正计时" },
        ]}
      />

      {kind === "countdown" ? (
        <DurationField seconds={seconds} onChange={setSeconds} />
      ) : (
        <p className="text-sm text-muted">正计时不设总时长，结束时手动停止并记录到统计里。</p>
      )}
    </Dialog>
  );
}
