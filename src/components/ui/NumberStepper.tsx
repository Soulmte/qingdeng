import { NumberField } from "@heroui/react";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  label?: string;
  /** 输入框下方的补充说明，例如这个值会带来什么效果 */
  hint?: string;
  /** 供交互测试定位输入框 */
  testId?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * 带加减按钮的数字输入：边框与填充由全局 --field-* 变量统一控制，
 * 明暗两种场景下都能一眼看出这里可以改。
 *
 * 注意：取值会吸附到 min + n×step 的网格上，
 * 步长必须能整除常用取值，否则输入 120 会被吸到 115。
 */
export function NumberStepper({
  value,
  onChange,
  ariaLabel,
  label,
  hint,
  testId,
  min = 0,
  max = 999,
  step = 1,
  disabled,
  className,
}: NumberStepperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-xs text-muted">{label}</span> : null}
      <NumberField
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        minValue={min}
        maxValue={max}
        step={step}
        isDisabled={disabled}
        className={className}
      >
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input data-testid={testId} />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
      {hint ? <span className="text-[0.7rem] text-muted">{hint}</span> : null}
    </div>
  );
}
