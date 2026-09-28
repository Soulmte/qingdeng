/**
 * 交互检查：在 jsdom 里真实地渲染模板编辑弹窗并模拟输入与点击，
 * 用来验证「数值能不能改、按钮能不能点」这类只有跑起来才看得出的问题。
 *
 * 运行：npm run check:interaction
 */
import "./dom-setup";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { PresetEditorDialog } from "@/components/timer/PresetEditorDialog";
import { UpdateDialog } from "@/components/UpdateDialog";
import { BUILTIN_PRESETS } from "@/lib/presets";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTimerStore } from "@/stores/timerStore";
import { useUpdateStore } from "@/stores/updateStore";
import { executed } from "./stub-tauri";

// 数据库写入走的是「在 Tauri 里才启用」的判定，这里把运行时标记补上
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {},
  writable: true,
  configurable: true,
});

const checks: [string, boolean, string][] = [];
const record = (name: string, passed: boolean, detail: string) => checks.push([name, passed, detail]);

const container = document.getElementById("root") as HTMLElement;
// Dialog 用 createPortal 挂到 body 上，所以断言要从 body 查
const scope = document.body as HTMLElement;
const query = (testId: string) => scope.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
const text = () => scope.textContent ?? "";

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

/**
 * 模拟一次完整的按压。
 * 同时发 pointer 与 mouse/click 事件：RAC 的 Button 监听 pointer，
 * HeroUI 的 Pressable 走鼠标与 click，两者都覆盖才能可靠触发 onPress。
 */
async function press(element: Element | null | undefined) {
  if (!element) return;
  await act(async () => {
    element.dispatchEvent(new window.PointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1 }));
    element.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1 }));
    element.dispatchEvent(new window.PointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0 }));
    element.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0 }));
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
  });
}

function findButton(label: string) {
  return Array.from(scope.querySelectorAll("button")).find((button) =>
    (button.textContent ?? "").replace(/\s+/g, "").includes(label.replace(/\s+/g, "")),
  );
}

async function commitInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    input.focus();
    setNativeValue(input, value);
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    input.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  });
}

async function main() {
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <PresetEditorDialog
        open
        preset={null}
        layer={1}
        onClose={() => undefined}
        onSubmit={async () => undefined}
      />,
    );
  });

  const rounds = query("rounds");
  record("轮次输入框已渲染", Boolean(rounds), `found=${Boolean(rounds)}`);

  if (rounds) {
    record("轮次默认值为 3", rounds.value === "3", `value=${rounds.value}`);

    await commitInput(rounds, "12");
    record("轮次可以输入两位数", rounds.value === "12", `value=${rounds.value}`);
    record("摘要跟随轮次更新", text().includes("每 12 轮进入长休息"), `摘要=${text().includes("12 轮")}`);

    const plus = rounds.parentElement?.querySelector('[slot="increment"]');
    await press(plus);
    record("轮次 + 按钮能加一", rounds.value === "13", `value=${rounds.value}`);

    const minus = rounds.parentElement?.querySelector('[slot="decrement"]');
    await press(minus);
    record("轮次 − 按钮能减一", rounds.value === "12", `value=${rounds.value}`);
  }

  const chip = findButton("45 分");
  await press(chip);
  record("常用时长按钮生效", text().includes("专注 45 分钟"), `摘要=${text().includes("专注 45 分钟")}`);

  const withoutBreaks = findButton("不排休息");
  await press(withoutBreaks);
  const fieldsAfter = scope.querySelectorAll('[data-slot="number-field-input"]').length;
  record(
    "不排休息时收起休息字段但保留轮次",
    Boolean(query("rounds")) && fieldsAfter === 4 && text().includes("段与段之间不休息"),
    `字段数=${fieldsAfter} 轮次仍在=${Boolean(query("rounds"))}`,
  );

  const roundsWithoutBreaks = query("rounds");
  if (roundsWithoutBreaks) {
    await commitInput(roundsWithoutBreaks, "5");
    record(
      "不排休息时轮次仍可修改",
      roundsWithoutBreaks.value === "5" && text().includes("连续完成 5 段专注"),
      `value=${roundsWithoutBreaks.value}`,
    );
  }

  let failed = 0;

  // ── 计时：自动接续与手动结束计入 ──────────────────────────
  const classic = BUILTIN_PRESETS[0];
  const sessionInserts = () => executed.filter(([sql]) => sql.includes("INSERT INTO sessions"));

  /** 把状态机摆到「专注跑了一半」的样子 */
  const seedFocus = (elapsedSeconds: number) => {
    useTimerStore.setState({
      preset: classic,
      phase: "focus",
      round: 1,
      status: "paused",
      elapsedMs: elapsedSeconds * 1000,
      startedAtMs: null,
      sessionStartedAtMs: Date.now() - elapsedSeconds * 1000,
      taskId: null,
      taskName: "",
      error: null,
    });
  };

  /** 落库是异步的，等一轮微任务再看结果 */
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  record(
    "默认开启自动接续",
    useSettingsStore.getState().autoContinue === true,
    `autoContinue=${useSettingsStore.getState().autoContinue}`,
  );

  const beforeEnd = sessionInserts().length;
  seedFocus(300);
  await act(async () => {
    useTimerStore.getState().endPhase();
  });
  await settle();

  const afterEnd = useTimerStore.getState();
  record(
    "结束本段后接续到休息并自动开始",
    afterEnd.phase === "short_break" && afterEnd.status === "running",
    `phase=${afterEnd.phase} status=${afterEnd.status}`,
  );

  const written = sessionInserts();
  const endRow = written[written.length - 1]?.[1];
  record(
    "结束本段把已用时间写入记录",
    written.length === beforeEnd + 1 && Number(endRow?.[4]) === 300 && Number(endRow?.[5]) === 0,
    `新增=${written.length - beforeEnd} 秒=${String(endRow?.[4])} 完成=${String(endRow?.[5])}`,
  );

  await act(async () => {
    useSettingsStore.getState().update({ autoContinue: false });
  });
  seedFocus(300);
  await act(async () => {
    useTimerStore.getState().endPhase();
  });
  await settle();
  const halted = useTimerStore.getState();
  record(
    "关闭自动接续后停在下一段等待",
    halted.phase === "short_break" && halted.status === "idle",
    `phase=${halted.phase} status=${halted.status}`,
  );

  const beforeSkip = sessionInserts().length;
  seedFocus(5);
  await act(async () => {
    useTimerStore.getState().skip();
  });
  await settle();
  record(
    "跳过不计入不足 30 秒的片段",
    sessionInserts().length === beforeSkip && useTimerStore.getState().phase === "short_break",
    `新增=${sessionInserts().length - beforeSkip}`,
  );

  seedFocus(20);
  await act(async () => {
    useTimerStore.getState().endPhase();
  });
  await settle();
  const shortRow = sessionInserts().at(-1)?.[1];
  record(
    "手动结束即使很短也按实际用时计入",
    Number(shortRow?.[4]) === 20,
    `秒=${String(shortRow?.[4])}`,
  );

  // ── 更新弹窗：内容来自 CDN 清单 ──────────────────────────
  // 注意：zustand 在 SSR 下读的是初始状态，所以弹窗只能在这里用客户端渲染验证
  useUpdateStore.setState({
    currentVersion: "0.1.0",
    open: true,
    phase: "idle",
    info: {
      version: "0.2.0",
      currentVersion: "0.1.0",
      notes: "- 修复轮次编辑后无法保存\n- 新增启动时检查更新",
      date: "2026-09-28T09:00:00Z",
    },
  });

  await act(async () => {
    root.render(<UpdateDialog />);
  });

  const dialogText = text().replace(/\s+/g, "");
  record(
    "更新弹窗列出新版本与更新内容",
    dialogText.includes("发现新版本0.2.0") &&
      dialogText.includes("更新内容") &&
      dialogText.includes("修复轮次编辑后无法保存") &&
      dialogText.includes("当前版本0.1.0"),
    `标题=${dialogText.includes("发现新版本0.2.0")}`,
  );
  record(
    "更新弹窗给出忽略与稍后",
    dialogText.includes("忽略此版本") &&
      dialogText.includes("稍后提醒") &&
      dialogText.includes("立即更新"),
    `立即更新=${dialogText.includes("立即更新")}`,
  );

  await press(findButton("忽略此版本"));
  record(
    "忽略此版本会把版号写进设置",
    useSettingsStore.getState().skippedUpdateVersion === "0.2.0" &&
      useUpdateStore.getState().open === false,
    `skipped=${useSettingsStore.getState().skippedUpdateVersion} open=${useUpdateStore.getState().open}`,
  );

  for (const [name, passed, detail] of checks) {
    if (!passed) failed += 1;
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}  (${detail})`);
  }
  console.log(`\n合计 ${checks.length} 项，失败 ${failed} 项`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("交互检查异常：", error);
  process.exit(1);
});
