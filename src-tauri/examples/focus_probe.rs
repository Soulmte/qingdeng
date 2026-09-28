//! 只读探针：验证本机 Windows 是否支持专注助手（FocusSessionManager）。
//! 只查询状态，不启动或结束任何专注会话，因此不会改动系统免打扰设置。
//!
//! 运行：cargo run --example focus_probe

#[cfg(target_os = "windows")]
fn main() {
    use windows::UI::Shell::FocusSessionManager;
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    match FocusSessionManager::GetDefault() {
        Ok(manager) => {
            println!("FocusSessionManager::GetDefault: OK");
            match manager.IsFocusActive() {
                Ok(active) => println!("IsFocusActive: {active}"),
                Err(error) => println!("IsFocusActive 失败: {error}"),
            }
            println!("结论：本机支持系统免打扰开关");
        }
        Err(error) => {
            println!("FocusSessionManager::GetDefault 失败: {error}");
            println!("结论：本机系统版本不支持免打扰接口（需要 Windows 11）");
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn main() {
    println!("仅 Windows 支持");
}
