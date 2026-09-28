import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/lib/theme";

/** 亮暗场景切换，状态与 HeroUI 主题类保持一致 */
export function ThemeToggle() {
  const { isDark, toggle } = useAppTheme();

  return (
    <Button
      variant="secondary"
      isIconOnly
      aria-label={isDark ? "切换到亮色场景" : "切换到暗色场景"}
      onPress={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
