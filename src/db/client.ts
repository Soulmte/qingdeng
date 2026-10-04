import Database from "@tauri-apps/plugin-sql";
import type {
  CountdownDraft,
  CountdownRecord,
  PhaseKind,
  SessionRecord,
  TaskRecord,
  TimerKind,
  TimerPreset,
} from "@/lib/types";

/** 与 src-tauri/src/lib.rs 里 add_migrations 的键、以及 tauri.conf.json 的 preload 保持一致 */
export const DATABASE_URL = "sqlite:qingdeng.db";

let connection: Promise<Database> | null = null;

export function isDesktopRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function connect() {
  if (!isDesktopRuntime()) {
    return Promise.reject(new Error("数据库仅在桌面应用内可用，请用 npm run tauri dev 启动"));
  }
  connection ??= Database.load(DATABASE_URL);
  return connection;
}

interface SessionInput {
  presetId: number;
  presetName: string;
  phase: PhaseKind;
  planSeconds: number;
  actualSeconds: number;
  completed: boolean;
  taskId: number | null;
  task: string;
  startedAt: string;
  endedAt: string;
}

interface SessionRow {
  id: number;
  preset_id: number;
  preset_name: string;
  phase: PhaseKind;
  plan_seconds: number;
  actual_seconds: number;
  completed: number;
  task_id: number | null;
  task: string;
  started_at: string;
  ended_at: string;
}

interface TaskRow {
  id: number;
  title: string;
  note: string;
  estimate_rounds: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface PresetRow {
  id: number;
  name: string;
  kind: TimerKind;
  focus_seconds: number;
  short_break_seconds: number;
  long_break_seconds: number;
  rounds_per_set: number;
  auto_start_next: number;
}

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    presetId: row.preset_id,
    presetName: row.preset_name,
    phase: row.phase,
    planSeconds: row.plan_seconds,
    actualSeconds: row.actual_seconds,
    completed: row.completed,
    taskId: row.task_id,
    task: row.task,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function insertSession(input: SessionInput) {
  const db = await connect();
  return db.execute(
    `INSERT INTO sessions
       (preset_id, preset_name, phase, plan_seconds, actual_seconds, completed, task_id, task,
        started_at, ended_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.presetId,
      input.presetName,
      input.phase,
      input.planSeconds,
      input.actualSeconds,
      input.completed ? 1 : 0,
      input.taskId,
      input.task,
      input.startedAt,
      input.endedAt,
    ],
  );
}

const SESSION_COLUMNS = `id, preset_id, preset_name, phase, plan_seconds, actual_seconds,
       completed, task_id, task, started_at, ended_at`;

export async function listSessionsSince(isoDate: string): Promise<SessionRecord[]> {
  const db = await connect();
  const rows = await db.select<SessionRow[]>(
    `SELECT ${SESSION_COLUMNS} FROM sessions WHERE ended_at >= $1 ORDER BY ended_at DESC`,
    [isoDate],
  );
  return rows.map(toSessionRecord);
}

export async function listAllSessions(): Promise<SessionRecord[]> {
  const db = await connect();
  const rows = await db.select<SessionRow[]>(
    `SELECT ${SESSION_COLUMNS} FROM sessions ORDER BY ended_at DESC`,
  );
  return rows.map(toSessionRecord);
}

/** 统计页的「已保存多少条记录」，只取总数不拉明细 */
export async function countSessions(): Promise<number> {
  const db = await connect();
  const rows = await db.select<{ total: number }[]>("SELECT COUNT(*) AS total FROM sessions", []);
  return rows[0]?.total ?? 0;
}

export async function clearSessions() {
  const db = await connect();
  await db.execute("DELETE FROM sessions", []);
}

export async function listTasks(): Promise<TaskRecord[]> {
  const db = await connect();
  const rows = await db.select<TaskRow[]>(
    `SELECT id, title, note, estimate_rounds, status, created_at, completed_at
       FROM tasks
      ORDER BY status ASC, id DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    estimateRounds: row.estimate_rounds,
    status: row.status === "done" ? "done" : "open",
    createdAt: row.created_at,
    completedAt: row.completed_at,
    doneRounds: 0,
  }));
}

/** 每个任务已经完成的专注段数，用于任务列表的进度显示 */
export async function countRoundsByTask(): Promise<Record<number, number>> {
  const db = await connect();
  const rows = await db.select<{ task_id: number; rounds: number }[]>(
    `SELECT task_id, COUNT(*) AS rounds
       FROM sessions
      WHERE task_id IS NOT NULL AND phase = 'focus' AND completed = 1
      GROUP BY task_id`,
  );
  return Object.fromEntries(rows.map((row) => [row.task_id, row.rounds]));
}

export async function insertTask(input: {
  title: string;
  note: string;
  estimateRounds: number;
}) {
  const db = await connect();
  return db.execute(
    `INSERT INTO tasks (title, note, estimate_rounds, status, created_at)
     VALUES ($1, $2, $3, 'open', $4)`,
    [input.title, input.note, input.estimateRounds, new Date().toISOString()],
  );
}

export async function updateTaskContent(
  id: number,
  input: { title: string; note: string; estimateRounds: number },
) {
  const db = await connect();
  return db.execute(
    `UPDATE tasks SET title = $1, note = $2, estimate_rounds = $3 WHERE id = $4`,
    [input.title, input.note, input.estimateRounds, id],
  );
}

export async function setTaskStatus(id: number, done: boolean) {
  const db = await connect();
  return db.execute(
    `UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3`,
    [done ? "done" : "open", done ? new Date().toISOString() : null, id],
  );
}

export async function deleteTask(id: number) {
  const db = await connect();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function listCustomPresets(): Promise<TimerPreset[]> {
  const db = await connect();
  const rows = await db.select<PresetRow[]>(
    `SELECT id, name, kind, focus_seconds, short_break_seconds, long_break_seconds,
            rounds_per_set, auto_start_next
       FROM presets
      ORDER BY id DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    summary: "自定义模板",
    kind: row.kind,
    focusSeconds: row.focus_seconds,
    shortBreakSeconds: row.short_break_seconds,
    longBreakSeconds: row.long_break_seconds,
    roundsPerSet: row.rounds_per_set,
    autoStartNext: Boolean(row.auto_start_next),
    isBuiltin: false,
  }));
}

type PresetInput = Omit<TimerPreset, "id" | "summary" | "isBuiltin">;

export async function createPreset(input: PresetInput) {
  const db = await connect();
  return db.execute(
    `INSERT INTO presets
       (name, kind, focus_seconds, short_break_seconds, long_break_seconds, rounds_per_set,
        auto_start_next, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.name,
      input.kind,
      input.focusSeconds,
      input.shortBreakSeconds,
      input.longBreakSeconds,
      input.roundsPerSet,
      input.autoStartNext ? 1 : 0,
      new Date().toISOString(),
    ],
  );
}

export async function updatePreset(id: number, input: PresetInput) {
  const db = await connect();
  return db.execute(
    `UPDATE presets
        SET name = $1, kind = $2, focus_seconds = $3, short_break_seconds = $4,
            long_break_seconds = $5, rounds_per_set = $6, auto_start_next = $7
      WHERE id = $8`,
    [
      input.name,
      input.kind,
      input.focusSeconds,
      input.shortBreakSeconds,
      input.longBreakSeconds,
      input.roundsPerSet,
      input.autoStartNext ? 1 : 0,
      id,
    ],
  );
}

export async function deletePreset(id: number) {
  const db = await connect();
  await db.execute("DELETE FROM presets WHERE id = $1", [id]);
}

export async function listPresets(): Promise<TimerPreset[]> {
  return listCustomPresets();
}

interface SettingRow {
  key: string;
  value: string;
}

interface CountdownRow {
  id: number;
  title: string;
  target_at: string;
  show_in_immersive: number;
  created_at: string;
}

function toCountdownRecord(row: CountdownRow): CountdownRecord {
  return {
    id: row.id,
    title: row.title,
    targetAt: row.target_at,
    showInImmersive: row.show_in_immersive === 1,
    createdAt: row.created_at,
  };
}

/** 按目标时刻由近到远排；已经过去的排到最后，它们不该占着视线 */
export async function listCountdowns(): Promise<CountdownRecord[]> {
  const db = await connect();
  const rows = await db.select<CountdownRow[]>(
    `SELECT id, title, target_at, show_in_immersive, created_at
       FROM countdowns
      ORDER BY target_at ASC`,
  );
  return rows.map(toCountdownRecord);
}

export async function insertCountdown(input: CountdownDraft) {
  const db = await connect();
  return db.execute(
    `INSERT INTO countdowns (title, target_at, show_in_immersive, created_at)
     VALUES ($1, $2, $3, $4)`,
    [input.title, input.targetAt, input.showInImmersive ? 1 : 0, new Date().toISOString()],
  );
}

export async function updateCountdown(id: number, input: CountdownDraft) {
  const db = await connect();
  return db.execute(
    `UPDATE countdowns
        SET title = $1, target_at = $2, show_in_immersive = $3
      WHERE id = $4`,
    [input.title, input.targetAt, input.showInImmersive ? 1 : 0, id],
  );
}

export async function deleteCountdown(id: number) {
  const db = await connect();
  await db.execute("DELETE FROM countdowns WHERE id = $1", [id]);
}

export async function loadSettings(): Promise<Record<string, string>> {
  const db = await connect();
  const rows = await db.select<SettingRow[]>("SELECT key, value FROM settings", []);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function saveSetting(key: string, value: string) {
  const db = await connect();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

/** 导出用：一次性把所有数据取出来 */
export async function dumpAll() {
  const [sessions, tasks, presets, settings] = await Promise.all([
    listAllSessions(),
    listTasks(),
    listCustomPresets(),
    loadSettings(),
  ]);
  return { sessions, tasks, presets, settings };
}
