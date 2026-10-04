/** 设备探针的演示数据。结构照着真实表字段写，列名与 src/db/client.ts 的 row 一致。 */

interface SeedSession {
  id: number;
  preset_id: number;
  preset_name: string;
  phase: string;
  plan_seconds: number;
  actual_seconds: number;
  completed: number;
  task_id: number | null;
  task: string;
  started_at: string;
  ended_at: string;
}

export const SEED_TASKS = [
  {
    id: 3,
    title: "背 50 个单词",
    note: "早上过一遍，晚上再复习",
    estimate_rounds: 18,
    status: "open",
    created_at: new Date(Date.now() - 8 * 864e5).toISOString(),
    completed_at: null,
  },
  {
    id: 2,
    title: "读完《深度工作》第四章",
    note: "",
    estimate_rounds: 20,
    status: "open",
    created_at: new Date(Date.now() - 9 * 864e5).toISOString(),
    completed_at: null,
  },
  {
    id: 1,
    title: "整理第三章笔记",
    note: "把散记的要点归到一张图上",
    estimate_rounds: 24,
    status: "done",
    created_at: new Date(Date.now() - 10 * 864e5).toISOString(),
    completed_at: new Date(Date.now() - 2 * 864e5 - 3 * 36e5).toISOString(),
  },
];

/** 日期倒计时：偏移天数算成具体时刻，截图里的天数才稳定 */
function atDayOffset(offset: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const SEED_COUNTDOWNS = [
  // 目标是「那天 00:00」，所以往后再移一天，显示出来才是整数天
  {
    id: 1,
    title: "考研",
    target_at: atDayOffset(129, 0),
    show_in_immersive: 1,
    created_at: atDayOffset(-30, 9),
  },
  {
    id: 2,
    title: "期末周",
    target_at: atDayOffset(31, 8),
    show_in_immersive: 1,
    created_at: atDayOffset(-20, 9),
  },
  {
    id: 3,
    title: "出发去旅行",
    target_at: atDayOffset(10, 6),
    show_in_immersive: 0,
    created_at: atDayOffset(-12, 9),
  },
  {
    id: 4,
    title: "生日",
    target_at: atDayOffset(-5, 0),
    show_in_immersive: 0,
    created_at: atDayOffset(-40, 9),
  },
];

export const SEED_SETTINGS: Record<string, string> = {
  lastPresetId: "-1",
  lastTaskId: "3",
  clockFace: "ring",
  dailyGoalMinutes: "120",
  soundEnabled: "true",
  notifyEnabled: "true",
  notifyTaskDone: "true",
  dndEnabled: "false",
  keepAwake: "true",
  alwaysOnTop: "false",
  immersiveAutoFullscreen: "true",
  immersiveAlwaysShowClock: "true",
  autoContinue: "true",
};

export function seedSessions(): SeedSession[] {
  const perDay = [3, 0, 5, 2, 4, 0, 3, 6, 2, 5, 3, 4, 0, 4];
  const rows: SeedSession[] = [];
  let id = 0;

  perDay.forEach((count, offset) => {
    const day = new Date();
    day.setDate(day.getDate() - (perDay.length - 1 - offset));
    const started = new Date(day);
    started.setHours(9, 10, 0, 0);

    for (let slot = 0; slot < count; slot += 1) {
      const plan = slot % 3 === 2 ? 3000 : 1500;
      const completed = slot === count - 1 && count >= 4 ? 0 : 1;
      const actual = completed ? plan : Math.round(plan * 0.6);
      const task = SEED_TASKS[(slot + offset) % SEED_TASKS.length];
      const begin = new Date(started.getTime() + slot * 32 * 60_000);
      const end = new Date(begin.getTime() + actual * 1000);
      if (end.getTime() > Date.now()) continue;

      rows.push({
        id: (id += 1),
        preset_id: -1,
        preset_name: "经典番茄钟",
        phase: "focus",
        plan_seconds: plan,
        actual_seconds: actual,
        completed,
        task_id: task.id,
        task: task.title,
        started_at: begin.toISOString(),
        ended_at: end.toISOString(),
      });
      rows.push({
        id: (id += 1),
        preset_id: -1,
        preset_name: "经典番茄钟",
        phase: "short_break",
        plan_seconds: 300,
        actual_seconds: 300,
        completed: 1,
        task_id: null,
        task: "",
        started_at: end.toISOString(),
        ended_at: new Date(end.getTime() + 300_000).toISOString(),
      });
    }
  });

  return rows;
}
