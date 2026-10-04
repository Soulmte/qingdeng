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

import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Legend, LegendItem, LegendLabel, LegendMarker, LegendValue } from "@/components/charts";
import { AppShell } from "@/components/layout/AppShell";
import { RingClock } from "@/components/clock/RingClock";
import { CountdownEditorDialog } from "@/components/countdown/CountdownEditorDialog";
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
import {
  countdownParts,
  formatRemaining,
  formatTargetAt,
  fromDateTimeInput,
  primaryUnit,
} from "@/lib/countdown";
import { formatDurationLabel } from "@/lib/time";
import { parseNotes } from "@/lib/updater";
import type { SessionRecord } from "@/lib/types";
import { useTimerStore } from "@/stores/timerStore";
import SettingsPage from "@/views/SettingsPage";
import StatsPage from "@/views/StatsPage";
import TasksPage from "@/views/TasksPage";
import TimerPage from "@/views/TimerPage";
import CountdownsPage from "@/views/CountdownsPage";

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
  /** 25% 进度：光点该落在右侧水平位置 */
  quarter: renderToStaticMarkup(
    <RingClock
      ms={25 * 60 * 1000}
      progress={0.25}
      label="专注"
      tone="focus"
      countup={false}
      running
    />,
  ),
  /** 0 进度：弧长为零，不该留一个孤零零的光点 */
  empty: renderToStaticMarkup(
    <RingClock
      ms={25 * 60 * 1000}
      progress={0}
      label="专注"
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
const countdownsHtml = renderToStaticMarkup(<CountdownsPage />);

// 倒计时编辑器：日期与时刻用原生输入，手机上能唤起系统选择器
const COUNTDOWN_NOW = new Date(2026, 11, 26, 8, 30);
const countdownEditorHtml = renderToStaticMarkup(
  <CountdownEditorDialog
    open
    countdown={null}
    now={COUNTDOWN_NOW}
    onClose={() => undefined}
    onSubmit={async () => undefined}
  />,
);

// 倒计时的时间计算全是纯函数，直接验算：
// 目标 2026-12-26，站在 2026-11-20 09:30 看，中间隔 36 个零点
const cdFuture = countdownParts(new Date(2026, 11, 26, 0, 0), new Date(2026, 10, 20, 9, 30));
// 目标当天看：2026-12-26 08:30，站在 03:10 看，还差 5 小时 20 分
const cdImminent = countdownParts(new Date(2026, 11, 26, 8, 30), new Date(2026, 11, 26, 3, 10));
// 站在目标后 3 天看
const cdPast = countdownParts(new Date(2026, 11, 26, 0, 0), new Date(2026, 11, 29, 1, 0));
// 同一个日子里换时间点，天数应保持不变（零点才翻页）
const cdSameMorning = countdownParts(new Date(2026, 11, 26, 0, 0), new Date(2026, 10, 20, 0, 5));
const cdSameNight = countdownParts(new Date(2026, 11, 26, 0, 0), new Date(2026, 10, 20, 23, 55));

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

/** 抠出渲染结果里某个属性的全部取值，用来校验画出来的几何数值 */
const attrValues = (html: string, name: string) =>
  Array.from(html.matchAll(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, "g"))).map(
    (match) => match[1],
  );
const num = (value: string | undefined) =>
  value === undefined ? Number.NaN : Number.parseFloat(value);

// 圆环钟的几何：刻度、渐变弧、弧头光点都靠算出来的坐标，这里把坐标验一遍
const tickAngles = attrValues(rings.quarter, "transform").map((value) =>
  num(/rotate\(([-\d.]+)/.exec(value)?.[1]),
);
const quarterRadii = attrValues(rings.quarter, "r").map(num);
const emptyRadii = attrValues(rings.empty, "r").map(num);
// 进度弧的 dasharray 就是整圈周长，反推半径后可以验光点有没有落在环上
const circumference = num(attrValues(rings.quarter, "stroke-dasharray")[0]);
const ringRadius = circumference / (2 * Math.PI);
const dashOffset = num(attrValues(rings.quarter, "stroke-dashoffset")[0]);
const gradientId = attrValues(rings.quarter, "id")[0];
// 两个光点圆是最后画的两个，半径明显小于基准圆
const beadRadii = quarterRadii.slice(-2);
const beadCx = num(attrValues(rings.quarter, "cx").at(-1));
const beadCy = num(attrValues(rings.quarter, "cy").at(-1));

/** 图标栏那一段标记，用来确认它里面只有图标 */
const railHtml = shellHtml.slice(
  shellHtml.indexOf("nav-rail"),
  shellHtml.indexOf("</aside>", shellHtml.indexOf("nav-rail")),
);

// 导航与弹层的形态由 index.css 决定，这几条断言盯的是那份样式表
const shellCss = readFileSync("src/index.css", "utf8");

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
    // 旧的纯文本行叫「已保存记录」，现在记录条数写在数据管理卡片的说明里
    !settingsHtml.includes("已保存记录") && settingsHtml.includes("条计时记录"),
    `已保存记录行=${settingsHtml.includes("已保存记录")} 条数说明=${settingsHtml.includes("条计时记录")}`,
  ],
  [
    "计时页时钟按位数选择字号",
    rings.long.includes("10:00:00") && rings.long.includes("text-[9.2cqw]"),
    `长时长显示 10:00:00=${rings.long.includes("10:00:00")}`,
  ],
  [
    "圆环字号按容器比例而不是固定档位",
    // 字号的单位是 cqw，容器再窄也不会顶出圆环；分三档：≤5 位、6-7 位、8 位以上
    rings.short.includes("text-[14cqw]") &&
      rings.long.includes("text-[9.2cqw]") &&
      rings.short.includes("clock-box") &&
      rings.long.includes("clock-box"),
    `短=${rings.short.includes("text-[14cqw]")} 长=${rings.long.includes("text-[9.2cqw]")}`,
  ],
  [
    "圆环容器留了宽度下限",
    // 手机横屏视口很矮，只按 vh 算会挤成一个读不出数字的小圆圈
    rings.short.includes("max-w-[min(520px,44vh)]") && rings.short.includes("min-w-[180px]"),
    `max-w=${rings.short.includes("max-w-[min(520px,44vh)]")}`,
  ],
  [
    "圆环画满 60 格刻度并按 6° 均分",
    tickAngles.length === 60 &&
      tickAngles.every((angle, index) => angle === index * 6 && angle < 360),
    `刻度数=${tickAngles.length}`,
  ],
  [
    "进度弧改用渐变描边",
    Boolean(gradientId) &&
      rings.quarter.includes(`url(#${gradientId})`) &&
      attrValues(rings.quarter, "stop-opacity").join(",") === "0.72,1",
    `渐变=${gradientId ?? "无"} 端点=${attrValues(rings.quarter, "stop-opacity").join("/")}`,
  ],
  [
    "进度弧的虚线偏移对应实际进度",
    // 25% 进度剩四分之三圈没画，容差给一位小数
    Math.abs(dashOffset - circumference * 0.75) < 0.5 &&
      Math.abs(ringRadius - 117) < 0.1,
    `周长=${circumference.toFixed(2)} 偏移=${dashOffset.toFixed(2)} 半径=${ringRadius.toFixed(2)}`,
  ],
  [
    "弧头光点落在进度弧末端",
    // 25% 时角度是 90°，所以横坐标回到圆心、纵坐标正好压在环上
    beadRadii.length === 2 &&
      beadRadii.every((radius) => radius > 2 && radius < 10) &&
      Math.abs(beadCx - 150) < 0.5 &&
      Math.abs(beadCy - (150 + ringRadius)) < 0.5,
    `光点=(${beadCx.toFixed(2)},${beadCy.toFixed(2)}) 半径=${beadRadii.map((r) => r.toFixed(2)).join("/")}`,
  ],
  [
    "进度为零时不留下孤立的光点",
    // 零进度只比有进度少那两个光点圆
    emptyRadii.length === quarterRadii.length - 2,
    `零进度圆数=${emptyRadii.length} 25% 圆数=${quarterRadii.length}`,
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
    // 侧边栏（full）、顶栏（compact）、手机那条（strip）各 5 盏，静态 HTML 里三份都在
    count(shellHtml, "M4.4 16.2h15.2") === 15 && textOf(shellHtml).includes("0/120 分钟"),
    `灯位数=${count(shellHtml, "M4.4 16.2h15.2")}`,
  ],
  [
    "顶栏提供一个紧凑的今日进度",
    shellHtml.includes("rounded-full bg-default") && shellHtml.includes("size-3.5"),
    `紧凑进度=${shellHtml.includes("rounded-full bg-default")}`,
  ],
  [
    "导航按指针类型与宽度切成侧边栏 / 图标栏 / 底栏",
    shellHtml.includes("nav-sidebar") &&
      shellHtml.includes("nav-rail") &&
      shellHtml.includes("nav-bottom") &&
      shellHtml.includes("fixed inset-x-0 bottom-0") &&
      shellHtml.includes("env(safe-area-inset-bottom)"),
    `侧边栏=${shellHtml.includes("nav-sidebar")} 图标栏=${shellHtml.includes("nav-rail")} 底栏=${shellHtml.includes("nav-bottom")}`,
  ],
  [
    "平板与窄屏的图标栏只留图标，不做两行",
    // 图标栏里不能再出现竖排的文字标签，否则又变回「图标 + 文字」的宽栏
    railHtml.length > 0 &&
      !railHtml.includes("text-[0.7rem]") &&
      count(railHtml, "<a ") === 6 &&
      railHtml.includes('aria-label="任务"'),
    `图标栏链接=${count(railHtml, "<a ")} 含文字=${railHtml.includes("text-[0.7rem]")}`,
  ],
  [
    "手机顶栏下面单独一条今日进度",
    // 手机上顶栏放不下灯位，单独一条细带放在顶栏下面，宽屏与侧边栏形态下隐藏
    shellHtml.includes("border-b border-foreground/10 px-4 py-2 md:hidden") &&
      count(shellHtml, "今日点亮") === 1,
    `今日进度带=${shellHtml.includes("border-b border-foreground/10 px-4 py-2 md:hidden")}`,
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
    "设置页关于区面向使用者",
    settingsHtml.includes("反馈问题") &&
      settingsHtml.includes("不会上传到任何服务器") &&
      !settingsHtml.includes("Tauri + React") &&
      !settingsHtml.includes("%APPDATA%"),
    `反馈=${settingsHtml.includes("反馈问题")} 技术栈=${settingsHtml.includes("Tauri + React")} 原始路径=${settingsHtml.includes("%APPDATA%")}`,
  ],
  [
    "清单里的更新说明能拆成列表",
    parseNotes("- 第一条\n\n第二条").length === 2 &&
      parseNotes("- 第一条")[0].bullet === true &&
      parseNotes("普通一行")[0].bullet === false,
    JSON.stringify(parseNotes("- 甲\n乙")),
  ],
  [
    "更新说明里的标题不会显示成井号",
    // 发布说明同时当 Release 正文用，一级标题丢掉，二级标题当小节
    parseNotes("# 青灯 v0.2.1\n\n## 改进\n\n- 一条").length === 2 &&
      parseNotes("## 改进")[0].heading === true &&
      parseNotes("## 改进")[0].text === "改进" &&
      parseNotes("- 一条")[0].heading === false,
    JSON.stringify(parseNotes("# 青灯 v0.2.1\n## 改进")),
  ],
  [
    "触屏设备不会看到桌面侧边栏",
    // 侧边栏只在「鼠标设备」下显示，安卓平板横屏普遍超过 1024px，只按宽度判断会落到桌面布局
    shellCss.includes("html:not(.touch-ui) .nav-sidebar") && shellCss.includes("touch-ui"),
    `含 touch-ui 守卫=${shellCss.includes("html:not(.touch-ui) .nav-sidebar")}`,
  ],
  [
    "手机上的弹窗贴底铺满",
    shellCss.includes(".dialog-sheet") &&
      shellCss.includes("width < 40rem") &&
      shellCss.includes("max-width: 100%"),
    `dialog-sheet=${shellCss.includes(".dialog-sheet")}`,
  ],
  [
    "时钟字号按容器比例，不依赖窗口宽度",
    shellCss.includes("container-type: inline-size") && shellCss.includes(".clock-box"),
    `clock-box=${shellCss.includes(".clock-box")}`,
  ],
  [
    "导航含计时 / 倒计时 / 任务 / 模式 / 统计 / 设置六个入口",
    // 侧边栏与底栏的标签是可见文字，图标栏只有 aria-label
    shellHtml.includes('aria-label="倒计时"') &&
      count(shellHtml, ">倒计时<") === 2 &&
      count(shellHtml, 'aria-label="倒计时"') === 1,
    `可见标签 ${count(shellHtml, ">倒计时<")} 处，图标栏 ${count(shellHtml, 'aria-label="倒计时"')} 处`,
  ],
  [
    "倒计时的天数按日历天算，零点才翻页",
    cdFuture.days === 36 && !cdFuture.past && formatRemaining(cdFuture) === "还有 36 天",
    `${cdFuture.days} 天 / ${formatRemaining(cdFuture)}`,
  ],
  [
    "同一天里换时间点，天数不变",
    cdSameMorning.days === 36 &&
      cdSameNight.days === 36 &&
      cdSameMorning.days === cdSameNight.days,
    `00:05 → ${cdSameMorning.days} 天，23:55 → ${cdSameNight.days} 天`,
  ],
  [
    "到了目标这一天改成报小时与分钟",
    cdImminent.days === 0 &&
      primaryUnit(cdImminent).unit === "小时" &&
      primaryUnit(cdImminent).value === 5 &&
      formatRemaining(cdImminent) === "还有 5 小时 20 分",
    `${formatRemaining(cdImminent)}`,
  ],
  [
    "过了目标时刻改说「已过去」",
    cdPast.past &&
      cdPast.days === 3 &&
      primaryUnit(cdPast).unit === "天" &&
      formatRemaining(cdPast) === "已过去 3 天",
    `${formatRemaining(cdPast)}`,
  ],
  [
    "日期 + 时刻按本地时间拼，不会整整差一天",
    // new Date("2026-12-26") 会按 UTC 解析，东八区就变成前一天，这里必须自己拼
    (() => {
      const iso = fromDateTimeInput("2026-12-26", "08:30");
      if (!iso) return false;
      const back = new Date(iso);
      return (
        back.getFullYear() === 2026 &&
        back.getMonth() === 11 &&
        back.getDate() === 26 &&
        back.getHours() === 8 &&
        back.getMinutes() === 30
      );
    })(),
    `目标时刻=${formatTargetAt(fromDateTimeInput("2026-12-26", "08:30") ?? "")}`,
  ],
  [
    "不存在的日期会被挡下来",
    fromDateTimeInput("2027-02-30", "09:00") === null &&
      fromDateTimeInput("", "09:00") === null &&
      fromDateTimeInput("2027-02-28", "25:00") === null,
    `2月30日=${fromDateTimeInput("2027-02-30", "09:00")}`,
  ],
  [
    "倒计时编辑器用原生日期与时刻输入",
    countdownEditorHtml.includes('type="date"') &&
      countdownEditorHtml.includes('type="time"') &&
      // 新建默认停在明天 23:59，整天都算还没到
      countdownEditorHtml.includes('value="2026-12-27"') &&
      countdownEditorHtml.includes('value="23:59"'),
    `默认日期=${/value="(\d{4}-\d{2}-\d{2})"/.exec(countdownEditorHtml)?.[1]}`,
  ],
  [
    "倒计时页在没有条目时给出引导",
    countdownsHtml.includes("倒计时") && countdownsHtml.includes("还没有倒计时"),
    `含空态=${countdownsHtml.includes("还没有倒计时")}`,
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
