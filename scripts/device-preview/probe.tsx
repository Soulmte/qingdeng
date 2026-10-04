/**
 * 设备探针入口：在浏览器里（而不是 SSR）挂载真实的 AppShell 与各页面，
 * 这样 zustand 的客户端状态、媒体查询、容器查询都是真的，
 * 可以按任意视口宽度截图来核对手机与平板布局。
 *
 * 地址参数：
 *   ?page=timer|tasks|modes|stats|settings
 *   ?theme=light|dark
 *   ?touch=1        模拟安卓（触屏）布局，等价于 <html class="touch-ui">
 *   ?wide=1         桌面宽屏：让侧边栏显示出来（仅 theme 为亮色时好看）
 *
 * 仅在本地核对时使用，不参与打包。
 */
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ImmersiveView } from "@/components/ImmersiveView";
import { TemplateDialog } from "@/components/timer/TemplateDialog";
import { applyThemeClass } from "@/lib/theme";
import { useCountdownStore } from "@/stores/countdownStore";
import { useImmersiveStore } from "@/stores/immersiveStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTaskStore } from "@/stores/taskStore";
import { useTimerStore } from "@/stores/timerStore";
import { BUILTIN_PRESETS } from "@/lib/presets";
import CountdownsPage from "@/views/CountdownsPage";
import ModesPage from "@/views/ModesPage";
import SettingsPage from "@/views/SettingsPage";
import StatsPage from "@/views/StatsPage";
import TasksPage from "@/views/TasksPage";
import TimerPage from "@/views/TimerPage";
import { SEED_COUNTDOWNS, SEED_SETTINGS, SEED_TASKS, seedSessions } from "./seed";

const params = new URLSearchParams(location.search);
const theme = params.get("theme") === "dark" ? "dark" : "light";

// 数据库的入口会检查这个标记，补上才不会再报「仅桌面应用内可用」
Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });

applyThemeClass(theme);
document.documentElement.classList.toggle("touch-ui", params.get("touch") === "1");

// 设置：直接按演示值填，跳过数据库
useSettingsStore.setState({
  ...useSettingsStore.getState(),
  lastPresetId: Number(SEED_SETTINGS.lastPresetId),
  lastTaskId: Number(SEED_SETTINGS.lastTaskId),
  clockFace: "ring",
  dailyGoalMinutes: Number(SEED_SETTINGS.dailyGoalMinutes),
  autoContinue: true,
  immersiveAlwaysShowClock: true,
  ready: true,
});

// 任务
useTaskStore.setState({
  ...useTaskStore.getState(),
  tasks: SEED_TASKS.map((task) => ({
    id: task.id,
    title: task.title,
    note: task.note,
    estimateRounds: task.estimate_rounds,
    status: task.status === "done" ? ("done" as const) : ("open" as const),
    createdAt: task.created_at,
    completedAt: task.completed_at,
    doneRounds: seedSessions().filter(
      (row) => row.task_id === task.id && row.phase === "focus" && row.completed === 1,
    ).length,
  })),
  ready: true,
});

// 倒计时
useCountdownStore.setState({
  ...useCountdownStore.getState(),
  countdowns: SEED_COUNTDOWNS.map((item) => ({
    id: item.id,
    title: item.title,
    targetAt: item.target_at,
    showInImmersive: item.show_in_immersive === 1,
    createdAt: item.created_at,
  })),
  ready: true,
});

// 计时器：停在一个跑到一半的专注段，圆环上能看到进度弧与光点
const classic = BUILTIN_PRESETS[0];
useTimerStore.setState({
  ...useTimerStore.getState(),
  preset: classic,
  phase: "focus",
  round: 2,
  status: "running",
  elapsedMs: 8 * 60_000,
  taskId: 3,
  taskName: "背 50 个单词",
});

const PAGES = {
  timer: TimerPage,
  countdowns: CountdownsPage,
  tasks: TasksPage,
  modes: ModesPage,
  stats: StatsPage,
  settings: SettingsPage,
};

const key = params.get("page") ?? "timer";
const Page = PAGES[key as keyof typeof PAGES] ?? TimerPage;

// 沉浸模式是盖在整页上的，单独开一个页面来看它
if (key === "immersive") useImmersiveStore.setState({ active: true });

createRoot(document.getElementById("root") as HTMLElement).render(
  <MemoryRouter>
    <AppShell>
      <Page />
    </AppShell>
    {/* 手机上弹层会变成贴底面版，单独看一眼 */}
    {key === "dialog" ? <TemplateDialog open onClose={() => undefined} /> : null}
    {key === "immersive" ? <ImmersiveView /> : null}
  </MemoryRouter>,
);

// 诊断：把横向越界的元素列出来，配合 --dump-dom 读回去
if (params.get("diag") === "1") {
  window.setTimeout(() => {
    const vw = document.documentElement.clientWidth;
    const lines: string[] = [
      `vw=${vw} scrollWidth=${document.documentElement.scrollWidth}`,
    ];
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      if (rect.right > vw + 1 || rect.left < -1) {
        const tag = el.tagName.toLowerCase();
        const cls = String(el.className).slice(0, 70).replace(/\s+/g, " ");
        lines.push(
          `OVERFLOW ${tag}.${cls} | L=${Math.round(rect.left)} R=${Math.round(rect.right)} W=${Math.round(rect.width)}`,
        );
      }
    });
    const pre = document.createElement("pre");
    pre.id = "diagnostics";
    pre.textContent = lines.slice(0, 60).join("\n");
    document.body.appendChild(pre);
  }, 1200);
}
