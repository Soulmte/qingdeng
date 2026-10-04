import { Switch } from "@heroui/react";

interface ToggleSwitchProps {
  /** 开关本身没有可见文字，靠这个给读屏器 */
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}

/** HeroUI 的 Switch 要拼四层，这里收成一个组件，设置页与倒计时都用它 */
export function ToggleSwitch({ label, isSelected, onChange }: ToggleSwitchProps) {
  return (
    <Switch aria-label={label} isSelected={isSelected} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
