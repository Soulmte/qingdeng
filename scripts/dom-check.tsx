/**
 * 把页面渲染成静态 HTML 并检查关键结构，
 * 用于在没有图形界面时确认组件真的渲染出来了。
 *
 * 运行：npx esbuild scripts/dom-check.tsx --bundle --platform=node --format=esm \
 *         --alias:@=./src --alias:@tauri-apps/plugin-sql=./scripts/stub-tauri.ts \
 *         --alias:@tauri-apps/api/window=./scripts/stub-tauri.ts \
 *         --alias:@tauri-apps/api/core=./scripts/stub-tauri.ts \
 *         --outfile=scripts/dom-check.mjs && node scripts/dom-check.mjs
 */
import "./desktop-env";

import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Legend, LegendItem, LegendLabel, LegendMarker, LegendValue } from "@/components/charts";
import { AppShell } from "@/components/layout/AppShell";
import { RingClock } from "@/components/clock/RingClock";
import { PresetEditorDialog } from "@/components/timer/PresetEditorDialog";
import { TaskPickerDialog } from "@/components/timer/TaskPickerDialog";
import { TemplateDialog } from "@/components/timer/TemplateDialog";
import { sessionsToCsv } from "@/lib/exporter";
import { GOAL_MIN, GOAL_STEP } from "@/lib/presetEditor";
import {
  supportsAutoUpdate,
  supportsFocusAssist,
  supportsKeepAwake,
  supportsRevealInFolder,
  supportsWindowControls,
} from "@/lib/platform";
import { buildDailySeries } from "@/lib/stats";
import { formatDurationLabel } from "@/lib/time";
import { parseNotes } from "@/lib/updater";
import type { SessionRecord } from "@/lib/types";
import { useTimerStore } from "@/stores/timerStore";
import SettingsPage from "@/views/SettingsPage";
import StatsPage from "@/views/StatsPage";
import TasksPage from "@/views/TasksPage";
import TimerPage from "@/views/TimerPage";

const LONG_PRESET = {
  id: 0,
  name: "十小时倒计时",
  summary: "结构检查用",
  kind: "countdown" as const,
  focusSeconds: 10 * 3600,
  shortBreakSeconds: 0,
  longBreakSeconds: 0,
  roundsPerSet: 1,
  autoStartNext: false,
  isBuiltin: false,
};

useTimerStore.setState({
  preset: LONG_PRESET,
  phase: "focus",
  round: 1,
  status: "idle",
  elapsedMs: 0,
});

const rings = {
  long: renderToStaticMarkup(
    <RingClock
      ms={10 * 3600 * 1000}
      progress={0.3}
      label="专注"
      sublabel="预计 23:40 结束"
      tone="focus"
      countup={false}
      running={false}
    />,
  ),
  short: renderToStaticMarkup(
    <RingClock
      ms={25 * 60 * 1000}
      progress={0.3}
      label="专注"
      sublabel="第 1 / 4 轮"
      tone="focus"
      countup={false}
      running={false}
    />,
  ),
};

console.log(
  `调试：store 中的模板 = ${useTimerStore.getState().preset.name} / ${useTimerStore.getState().preset.focusSeconds}`,
);

const settingsHtml = renderToStaticMarkup(<SettingsPage />);
const timerHtml = renderToStaticMarkup(<TimerPage />);
const dialogHtml = renderToStaticMarkup(<TemplateDialog open onClose={() => undefined} />);
const editorHtml = renderToStaticMarkup(
  <PresetEditorDialog
    open
    preset={null}
    layer={2}
    onClose={() => undefined}
    onSubmit={async () => undefined}
  />,
);
const shellHtml = renderToStaticMarkup(
  <MemoryRouter>
    <AppShell>
      <div>页面占位</div>
    </AppShell>
  </MemoryRouter>,
);

const statsHtml = renderToStaticMarkup(<StatsPage />);
const tasksHtml = renderToStaticMarkup(<TasksPage />);
const taskPickerHtml = renderToStaticMarkup(<TaskPickerDialog open onClose={() => undefined} />);

const csv = sessionsToCsv([
  {
    ...focusSession(new Date(), 25),
    task: '第三章, 初稿 "草稿"',
  },
]);

const legendHtml = renderToStaticMarkup(
  <Legend
    items={[{ label: "经典番茄钟", value: 320, maxValue: 500, color: "var(--chart-1)" }]}
    title="合计 320 分钟"
  >
    <LegendItem>
      <LegendMarker />
      <LegendLabel />
      <LegendValue showPercentage formatValue={(value) => `${value} 分钟`} />
    </LegendItem>
  </Legend>,
);

function focusSession(endedAt: Date, minutes: number, id = 1): SessionRecord {
  return {
    id,
    presetId: -1,
    presetName: "经典番茄钟",
    phase: "focus",
    planSeconds: minutes * 60,
    actualSeconds: minutes * 60,
    completed: 1,
    taskId: null,
    task: "",
    startedAt: new Date(endedAt.getTime() - minutes * 60_000).toISOString(),
    endedAt: endedAt.toISOString(),
  };
}

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(15, 0, 0, 0);

const seriesWithOneDay = buildDailySeries([focusSession(yesterday, 50)], 14);
const seriesWithoutData = buildDailySeries([], 14);
const seriesToday = buildDailySeries([focusSession(new Date(), 25)], 14);

writeFileSync("scripts/out-settings.html", settingsHtml);
writeFileSync("scripts/out-timer.html", timerHtml);
writeFileSync("scripts/out-dialog.html", dialogHtml);
writeFileSync("scripts/out-editor.html", editorHtml);
writeFileSync("scripts/out-shell.html", shellHtml);
writeFileSync("scripts/out-stats.html", statsHtml);
writeFileSync("scripts/out-tasks.html", tasksHtml);

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/** 去掉标签后的纯文本，便于断言被标签拆开的文案（如 0 与 /120 分钟） */
const textOf = (html: string) => html.replace(/<[^>]*>/g, "");

// 桌面能力应全部可用
const desktopCaps = {
  focus: supportsFocusAssist(),
  awake: supportsKeepAwake(),
  reveal: supportsRevealInFolder(),
  window: supportsWindowControls(),
  update: supportsAutoUpdate(),
};

// 换成 Android 平板 UA，桌面独有的能力应整体关闭（不影响顶栏布局）
const desktopNavigator = globalThis.navigator;
Object.defineProperty(globalThis, "navigator", {
  value: {
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  },
  writable: true,
  configurable: true,
});
const androidCaps = {
  focus: supportsFocusAssist(),
  awake: supportsKeepAwake(),
  reveal: supportsRevealInFolder(),
  window: supportsWindowControls(),
  update: supportsAutoUpdate(),
};
Object.defineProperty(globalThis, "navigator", {
  value: desktopNavigator,
  writable: true,
  configurable: true,
});

const checks: [string, boolean, string][] = [
  [
    "模板编辑弹窗使用步进控件",
    count(editorHtml, 'data-slot="number-field-increment-button"') === 10 &&
      count(editorHtml, 'data-slot="number-field-decrement-button"') === 10,
    `步进按钮=${count(editorHtml, 'data-slot="number-field-increment-button"')}`,
  ],
  [
    "时长按时分秒三段展示",
    textOf(editorHtml).includes("合计") &&
      formatDurationLabel(1500) === "25 分钟" &&
      formatDurationLabel(5400) === "1 小时 30 分钟" &&
      formatDurationLabel(5430) === "1 小时 30 分钟 30 秒",
    `1500→${formatDurationLabel(1500)} 5400→${formatDurationLabel(5400)} 5430→${formatDurationLabel(5430)}`,
  ],
  [
    "模板名称仍是可见的输入框",
    editorHtml.includes('class="input') || /class="[^"]*\binput\b/.test(editorHtml),
    `input 类=${count(editorHtml, "input ")}`,
  ],
  [
    "设置页目标分钟数用步进控件",
    count(settingsHtml, 'data-slot="number-field-increment-button"') === 1,
    `设置页步进按钮=${count(settingsHtml, 'data-slot="number-field-increment-button"')}`,
  ],
  [
    "设置页渲染出 9 个开关",
    count(settingsHtml, 'data-slot="switch-control"') === 9,
    `switch-control=${count(settingsHtml, 'data-slot="switch-control"')}`,
  ],
  [
    "设置页有免打扰白名单与导出入口",
    settingsHtml.includes("专注免打扰") &&
      settingsHtml.includes("提醒白名单") &&
      settingsHtml.includes("导出完整备份") &&
      settingsHtml.includes("导出记录表"),
    `白名单=${settingsHtml.includes("提醒白名单")} 导出=${settingsHtml.includes("导出完整备份")}`,
  ],
  [
    "目标步长能整除常用取值",
    GOAL_STEP > 0 && (120 - GOAL_MIN) % GOAL_STEP === 0 && GOAL_MIN <= 120,
    `min=${GOAL_MIN} step=${GOAL_STEP}`,
  ],
  [
    "模板弹窗有排休息 / 不排休息的选择",
    editorHtml.includes("排休息") &&
      editorHtml.includes("不排休息") &&
      editorHtml.includes("运行效果"),
    `选择按钮=${editorHtml.includes("不排休息")}`,
  ],
  [
    "任务页可以渲染",
    tasksHtml.includes("任务清单") &&
      tasksHtml.includes("添加一个任务，回车即可保存") &&
      tasksHtml.includes("进行中"),
    `添加栏=${tasksHtml.includes("添加一个任务，回车即可保存")}`,
  ],
  [
    "任务选择弹窗可以渲染",
    taskPickerHtml.includes("关联任务") &&
      taskPickerHtml.includes("不关联任务") &&
      taskPickerHtml.includes("快速新建"),
    `关联任务=${taskPickerHtml.includes("关联任务")}`,
  ],
  [
    "CSV 导出会转义逗号与引号",
    csv.includes('"第三章, 初稿 ""草稿"""') && csv.split("\n").length === 2,
    `首行=${csv.split("\n")[0]}`,
  ],
  [
    "侧边栏有任务入口与品牌名",
    shellHtml.includes("任务") && shellHtml.includes("青灯"),
    `品牌名=${shellHtml.includes("青灯")}`,
  ],
  [
    "沉浸模式时间常驻开关存在",
    settingsHtml.includes("当前时间常驻显示"),
    `包含开关行=${settingsHtml.includes("当前时间常驻显示")}`,
  ],
  [
    "统计页可以渲染",
    statsHtml.includes("专注统计") && statsHtml.includes("每日专注时长"),
    `标题=${statsHtml.includes("专注统计")}`,
  ],
  [
    "图例带数值与单位",
    legendHtml.includes("经典番茄钟") &&
      legendHtml.includes("分钟") &&
      legendHtml.includes("%"),
    `含数值=${legendHtml.includes("分钟")}`,
  ],
  [
    "日期序列从有记录那天开始",
    seriesWithOneDay.length === 2 &&
      seriesWithOneDay[0].minutes === 50 &&
      seriesWithOneDay[1].minutes === 0,
    `长度=${seriesWithOneDay.length} 首日分钟=${seriesWithOneDay[0]?.minutes}`,
  ],
  [
    "没有任何记录时保留完整区间",
    seriesWithoutData.length === 14,
    `长度=${seriesWithoutData.length}`,
  ],
  [
    "只有今天有记录时只给一天",
    seriesToday.length === 1 && seriesToday[0].minutes === 25,
    `长度=${seriesToday.length}`,
  ],
  [
    "设置页有清空记录按钮",
    settingsHtml.includes("清空记录"),
    `包含“清空记录”=${settingsHtml.includes("清空记录")}`,
  ],
  [
    "设置页不再有纯文本的设置行",
    !settingsHtml.includes("已保存记录") && settingsHtml.includes("当前共"),
    `已保存记录行=${settingsHtml.includes("已保存记录")}`,
  ],
  [
    "计时页时钟按位数选择字号",
    rings.long.includes("10:00:00") && rings.long.includes("text-5xl"),
    `长时长显示 10:00:00=${rings.long.includes("10:00:00")}`,
  ],
  [
    "长时长圆环使用 text-5xl",
    rings.long.includes("text-5xl"),
    `text-5xl=${rings.long.includes("text-5xl")}`,
  ],
  [
    "短时长圆环使用 text-7xl",
    rings.short.includes("text-7xl"),
    `text-7xl=${rings.short.includes("text-7xl")}`,
  ],
  [
    "圆环容器宽度放大到 520px",
    rings.short.includes("max-w-[min(520px,46vh)]"),
    `max-w=${rings.short.includes("max-w-[min(520px,46vh)]")}`,
  ],
  [
    "模板弹窗包含模板与快速开始两栏",
    dialogHtml.includes("模板与时长") &&
      dialogHtml.includes("计时模板") &&
      dialogHtml.includes("快速开始"),
    `两栏=${dialogHtml.includes("模板与时长") && dialogHtml.includes("快速开始")}`,
  ],
  [
    "模板弹窗可新建自定义模板",
    dialogHtml.includes("新建") && dialogHtml.includes("自定义单次时间"),
    `新建按钮=${dialogHtml.includes("新建")}`,
  ],
  [
    "内置模板给出复制而不是删除",
    count(dialogHtml, "复制") === 5,
    `复制按钮数=${count(dialogHtml, "复制")}`,
  ],
  [
    "计时页渲染出时钟与控制条",
    count(timerHtml, "clock-digits") > 0 && timerHtml.includes("沉浸模式"),
    `clock-digits=${count(timerHtml, "clock-digits")}`,
  ],
  [
    "计时页不复用侧边模板栏",
    !timerHtml.includes("计时模板"),
    `包含“计时模板”=${timerHtml.includes("计时模板")}`,
  ],
  [
    "侧边栏渲染出导航与今日进度",
    ["计时", "任务", "模式", "统计", "设置"].every((label) => shellHtml.includes(label)) &&
      shellHtml.includes("今日点亮") &&
      shellHtml.includes("盏青灯"),
    `今日点亮=${shellHtml.includes("今日点亮")} 盏青灯=${shellHtml.includes("盏青灯")}`,
  ],
  [
    "今日进度用青灯灯位表示",
    // 侧边栏（full）与顶栏（compact）各 5 盏，静态 HTML 里两份都在
    count(shellHtml, "M4.4 16.2h15.2") === 10 && textOf(shellHtml).includes("0/120 分钟"),
    `灯位数=${count(shellHtml, "M4.4 16.2h15.2")}`,
  ],
  [
    "顶栏提供一个紧凑的今日进度",
    shellHtml.includes("rounded-full bg-default") && shellHtml.includes("size-3.5"),
    `紧凑进度=${shellHtml.includes("rounded-full bg-default")}`,
  ],
  [
    "导航按宽度切成侧边栏 / 图标栏 / 底栏三种形态",
    shellHtml.includes("w-56 shrink-0") &&
      shellHtml.includes("w-[76px]") &&
      shellHtml.includes("fixed inset-x-0 bottom-0") &&
      shellHtml.includes("env(safe-area-inset-bottom)"),
    `侧边栏=${shellHtml.includes("w-56 shrink-0")} 图标栏=${shellHtml.includes("w-[76px]")} 底栏=${shellHtml.includes("fixed inset-x-0 bottom-0")}`,
  ],
  [
    "桌面端保留全部平台能力",
    desktopCaps.focus &&
      desktopCaps.awake &&
      desktopCaps.reveal &&
      desktopCaps.window &&
      desktopCaps.update,
    JSON.stringify(desktopCaps),
  ],
  [
    "Android 上关闭桌面独有的能力",
    !androidCaps.focus &&
      !androidCaps.awake &&
      !androidCaps.reveal &&
      !androidCaps.window &&
      !androidCaps.update,
    JSON.stringify(androidCaps),
  ],
  [
    "计时页提供结束本段并说明会计入",
    timerHtml.includes("结束本段") && textOf(timerHtml).includes("把已用时间计入统计"),
    `按钮=${timerHtml.includes("结束本段")}`,
  ],
  [
    "设置页有自动接续开关",
    settingsHtml.includes("自动接续下一段") &&
      settingsHtml.includes("阶段结束后自动开始下一段"),
    `开关行=${settingsHtml.includes("自动接续下一段")}`,
  ],
  [
    "清单里的更新说明能拆成列表",
    parseNotes("- 第一条\n\n第二条").length === 2 &&
      parseNotes("- 第一条")[0].bullet === true &&
      parseNotes("普通一行")[0].bullet === false,
    JSON.stringify(parseNotes("- 甲\n乙")),
  ],
  [
    "设置页不再出现毕业设计字样",
    !settingsHtml.includes("毕业设计"),
    `包含毕业设计=${settingsHtml.includes("毕业设计")}`,
  ],
  [
    "进度条填充部分存在",
    shellHtml.includes("progress-bar"),
    `progress-bar 类=${count(shellHtml, "progress-bar")}`,
  ],
];

let failed = 0;
for (const [name, passed, detail] of checks) {
  if (!passed) failed += 1;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}  (${detail})`);
}

// 放在最后，避免影响上面的渲染断言：直接驱动计时状态机验证不排休息的多段推进
useTimerStore.setState({
  preset: {
    id: 0,
    name: "三段连做",
    summary: "结构检查用",
    kind: "countdown",
    focusSeconds: 30 * 60,
    shortBreakSeconds: 0,
    longBreakSeconds: 0,
    roundsPerSet: 3,
    autoStartNext: false,
    isBuiltin: false,
  },
  phase: "focus",
  round: 1,
  status: "idle",
  elapsedMs: 0,
});

useTimerStore.getState().skip();
const firstSkip = useTimerStore.getState();
useTimerStore.getState().skip();
const secondSkip = useTimerStore.getState();
useTimerStore.getState().skip();
const thirdSkip = useTimerStore.getState();

const roundsPassed =
  firstSkip.phase === "focus" &&
  firstSkip.round === 2 &&
  firstSkip.status !== "finished" &&
  secondSkip.round === 3 &&
  secondSkip.status !== "finished" &&
  thirdSkip.status === "finished";

if (!roundsPassed) failed += 1;
console.log(
  `${roundsPassed ? "PASS" : "FAIL"}  不排休息的多段会逐段推进  ` +
    `(第1次=${firstSkip.round}/${firstSkip.status} 第2次=${secondSkip.round}/${secondSkip.status} 第3次=${thirdSkip.status})`,
);
console.log(`\n合计 ${checks.length + 1} 项，失败 ${failed} 项`);
process.exit(failed === 0 ? 0 : 1);
