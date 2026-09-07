pub mod error;
pub mod postgres_sync;

pub use error::CommandError;
use postgres_sync::{
    disconnect_postgres_impl, get_postgres_config_impl, save_postgres_config_impl,
    sync_postgres_impl, test_postgres_connection_impl, ConnectionTestResult,
    PostgresConfigInfo, SyncResult, SyncTask,
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, WindowEvent,
};

#[tauri::command]
fn export_backup_file(content: String, default_filename: String) -> Result<String, String> {
    let file = rfd::FileDialog::new()
        .set_file_name(&default_filename)
        .add_filter("JSON Backup", &["json"])
        .save_file();

    if let Some(path) = file {
        std::fs::write(&path, content).map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().to_string())
    } else {
        Err("Export cancelled by user".to_string())
    }
}

#[tauri::command]
fn import_backup_file() -> Result<String, String> {
    let file = rfd::FileDialog::new()
        .add_filter("JSON Backup", &["json"])
        .pick_file();

    if let Some(path) = file {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(content)
    } else {
        Err("Import cancelled by user".to_string())
    }
}

#[tauri::command]
async fn test_postgres_connection(url: String) -> Result<ConnectionTestResult, String> {
    test_postgres_connection_impl(url).await
}

#[tauri::command]
async fn save_postgres_config(
    app: AppHandle,
    url: String,
    auto_sync: bool,
) -> Result<PostgresConfigInfo, String> {
    save_postgres_config_impl(app, url, auto_sync).await
}

#[tauri::command]
async fn get_postgres_config(app: AppHandle) -> Result<PostgresConfigInfo, String> {
    get_postgres_config_impl(app).await
}

#[tauri::command]
async fn disconnect_postgres(app: AppHandle) -> Result<(), String> {
    disconnect_postgres_impl(app).await
}

#[tauri::command]
async fn sync_postgres(
    app: AppHandle,
    local_tasks: Vec<SyncTask>,
) -> Result<SyncResult, String> {
    sync_postgres_impl(app, local_tasks).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            export_backup_file,
            import_backup_file,
            test_postgres_connection,
            save_postgres_config,
            get_postgres_config,
            disconnect_postgres,
            sync_postgres
        ])
        .on_window_event(|window, event| {
            // Intercept window close: prevent exit and hide window to background tray
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            // Apply native OS window vibrancy/blur effects
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    let _ = window_vibrancy::apply_blur(&window, Some((11, 13, 18, 140)));
                }

                #[cfg(target_os = "macos")]
                {
                    let _ = window_vibrancy::apply_vibrancy(
                        &window,
                        window_vibrancy::NSVisualEffectMaterial::HudWindow,
                        None,
                        None,
                    );
                }
            }

            // System Tray setup with icon
            let show_item = MenuItemBuilder::new("Show CluaNote")
                .id("show")
                .build(app)?;

            let quit_item = MenuItemBuilder::new("Quit").id("quit").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("CluaNote - Task Planner");

            // Attach default window icon so it is never blank in system tray
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.set_focus();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
