use std::fs;
use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// 防休眠句柄：持有期间屏幕保持点亮，置空即释放。
/// keepawake 只有桌面实现，Android 上计时前台化由系统接管，无需该状态。
#[cfg(not(target_os = "android"))]
struct AwakeState(Mutex<Option<keepawake::KeepAwake>>);

/// 系统免打扰：记录我们是否开启过专注会话，只接管自己开的那个
struct FocusState(Mutex<bool>);

/// 建表脚本与 docs/schema.sql、src/db/client.ts 的字段一一对应。
/// 已发布的库不要改动这里的语句，新增字段请追加新的 Migration 版本。
const CREATE_SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id      INTEGER NOT NULL,
    preset_name    TEXT    NOT NULL,
    phase          TEXT    NOT NULL,
    plan_seconds   INTEGER NOT NULL,
    actual_seconds INTEGER NOT NULL,
    completed      INTEGER NOT NULL DEFAULT 0,
    task_id        INTEGER,
    task           TEXT    NOT NULL DEFAULT '',
    started_at     TEXT    NOT NULL,
    ended_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions (ended_at desc);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions (task_id);

CREATE TABLE IF NOT EXISTS presets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    kind                TEXT    NOT NULL,
    focus_seconds       INTEGER NOT NULL,
    short_break_seconds INTEGER NOT NULL,
    long_break_seconds  INTEGER NOT NULL,
    rounds_per_set      INTEGER NOT NULL,
    auto_start_next     INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    note            TEXT    NOT NULL DEFAULT '',
    estimate_rounds INTEGER NOT NULL DEFAULT 1,
    status          TEXT    NOT NULL DEFAULT 'open',
    created_at      TEXT    NOT NULL,
    completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
";

/// 第二版：日期倒计时。存「到某天某刻还有多久」，与专注计时互不干涉。
const CREATE_COUNTDOWNS: &str = "
CREATE TABLE IF NOT EXISTS countdowns (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    title              TEXT    NOT NULL,
    target_at          TEXT    NOT NULL,
    show_in_immersive  INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT    NOT NULL
);
";

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_qingdeng_schema",
            sql: CREATE_SCHEMA,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_countdowns",
            sql: CREATE_COUNTDOWNS,
            kind: MigrationKind::Up,
        },
    ]
}

/// 由前端在计时开始 / 结束时调用，避免长时间专注时屏幕自动熄灭
#[cfg(not(target_os = "android"))]
#[tauri::command]
fn set_keep_awake(state: tauri::State<'_, AwakeState>, enabled: bool) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|error| error.to_string())?;

    if !enabled {
        guard.take();
        return Ok(());
    }

    if guard.is_none() {
        let handle = keepawake::Builder::default()
            .display(true)
            .idle(true)
            .reason("青灯计时进行中")
            .app_name("青灯")
            .app_reverse_domain("com.qingdeng.app")
            .create()
            .map_err(|error| error.to_string())?;
        *guard = Some(handle);
    }

    Ok(())
}

/// Android 上没有可用的桌面防休眠接口，直接返回成功，前端无需为此分支
#[cfg(target_os = "android")]
#[tauri::command]
fn set_keep_awake(_enabled: bool) -> Result<(), String> {
    Ok(())
}

/// 把前端整理好的导出内容写到应用数据目录，返回文件绝对路径
#[tauri::command]
fn save_export(app: tauri::AppHandle, file_name: String, contents: String) -> Result<String, String> {
    // 只接受纯文件名，避免拼出目录穿越的路径
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("文件名不合法".into());
    }

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("exports");

    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

    let path = dir.join(file_name);
    fs::write(&path, contents).map_err(|error| error.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

/// Windows 11 的专注助手：开启后系统会静音其他应用的通知
#[cfg(target_os = "windows")]
fn apply_focus_assist(enabled: bool) -> Result<(), String> {
    std::thread::spawn(move || -> Result<(), String> {
        use windows::UI::Shell::FocusSessionManager;
        use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

        // WinRT 要求线程初始化 COM 套间，已初始化时会返回 S_FALSE，忽略即可
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }

        let manager = FocusSessionManager::GetDefault().map_err(|error| error.to_string())?;
        if enabled {
            manager
                .TryStartFocusSession()
                .map_err(|error| error.to_string())?;
        } else {
            manager.DeactivateFocus().map_err(|error| error.to_string())?;
        }

        Ok(())
    })
    .join()
    .map_err(|_| "免打扰调用线程异常".to_string())?
}

#[cfg(not(target_os = "windows"))]
fn apply_focus_assist(_enabled: bool) -> Result<(), String> {
    Err("系统免打扰仅支持 Windows 11".into())
}

/// 由前端在计时开始 / 结束时调用
#[tauri::command]
fn set_focus_assist(state: tauri::State<'_, FocusState>, enabled: bool) -> Result<(), String> {
    let mut started = state.0.lock().map_err(|error| error.to_string())?;

    // 状态没变化就不重复调用，避免把用户手动开的免打扰关掉
    if enabled == *started {
        return Ok(());
    }

    apply_focus_assist(enabled)?;
    *started = enabled;
    Ok(())
}

/// 打开系统的通知 / 专注助手设置页，应用自己无法修改系统级的免打扰名单
#[tauri::command]
fn open_system_settings(page: String) -> Result<(), String> {
    let target = match page.as_str() {
        "notifications" => "ms-settings:notifications",
        "quiethours" => "ms-settings:quiethours",
        _ => return Err("不支持的设置页".into()),
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", target])
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = target;
        Err("仅 Windows 支持".into())
    }
}

/// 退出时把系统免打扰交还回去，避免用户关掉青灯后还一直静音
fn release_focus_assist(handle: &tauri::AppHandle) {
    let state = handle.state::<FocusState>();
    let Ok(mut started) = state.0.lock() else {
        return;
    };

    if *started {
        let _ = apply_focus_assist(false);
        *started = false;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:qingdeng.db", migrations())
                .build(),
        )
        .manage(FocusState(Mutex::new(false)));

    #[cfg(not(target_os = "android"))]
    let builder = builder.manage(AwakeState(Mutex::new(None)));

    // 应用内更新与装完重启只在桌面端可用，Android 上更新走系统安装器
    #[cfg(not(target_os = "android"))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    let app = builder
        .invoke_handler(tauri::generate_handler![
            set_keep_awake,
            set_focus_assist,
            open_system_settings,
            save_export
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            release_focus_assist(handle);
        }
    });
}
