-- 青灯数据库结构（与 src-tauri/src/lib.rs 的 Migration 保持一致）
-- 该文件供论文「数据库设计」章节与人工查阅使用，实际建表由应用启动时的迁移完成。
-- 已发布的库不要改动这里的语句：新增字段或表请追加新的 Migration 版本。

-- 计时记录：每完成或中断一个阶段写入一行
CREATE TABLE IF NOT EXISTS sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id      INTEGER NOT NULL,              -- 模板 id，内置模板为负数，单次计时为 0
    preset_name    TEXT    NOT NULL,              -- 冗余模板名，便于模板删除后仍能追溯
    phase          TEXT    NOT NULL,              -- focus / short_break / long_break
    plan_seconds   INTEGER NOT NULL,              -- 计划时长（秒）
    actual_seconds INTEGER NOT NULL,              -- 实际计时时长（秒）
    completed      INTEGER NOT NULL DEFAULT 0,    -- 1 完整跑完，0 中途中断
    task_id        INTEGER,                       -- 关联任务 id，未关联为空
    task           TEXT    NOT NULL DEFAULT '',   -- 冗余任务名
    started_at     TEXT    NOT NULL,              -- ISO 8601
    ended_at       TEXT    NOT NULL               -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions (ended_at desc);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions (task_id);

-- 自定义计时模板
CREATE TABLE IF NOT EXISTS presets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    kind                TEXT    NOT NULL,          -- countdown / countup
    focus_seconds       INTEGER NOT NULL,
    short_break_seconds INTEGER NOT NULL,
    long_break_seconds  INTEGER NOT NULL,
    rounds_per_set      INTEGER NOT NULL,          -- 每几轮专注进入一次长休息
    auto_start_next     INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT    NOT NULL
);

-- 任务清单：预估段数与实际完成段数（由 sessions 聚合得出）
CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    note            TEXT    NOT NULL DEFAULT '',
    estimate_rounds INTEGER NOT NULL DEFAULT 1,
    status          TEXT    NOT NULL DEFAULT 'open',  -- open / done
    created_at      TEXT    NOT NULL,
    completed_at    TEXT                              -- 完成时间，未完成为空
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- 键值型偏好设置：主题、时钟形态、每日目标等
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
