use std::fs;
use std::path::Path;
use tauri::Manager;

fn ensure_data_directories() {
    let base = Path::new("C:\\LaPalmera");
    let subdirs = ["database", "backups", "images", "exports", "config"];
    for sub in &subdirs {
        let dir = base.join(sub);
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_data_directories();

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running La Palmera POS");
}

