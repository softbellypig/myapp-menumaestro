// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod storage;

use storage::Storage;
use tauri::{
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindowBuilder,
};

/// Show the custom popup menu window near the tray icon
fn show_popup_menu(app: &tauri::AppHandle, x: f64, y: f64) {
    let storage = app.state::<Storage>();
    let items = storage.get_menu_items();
    let settings = storage.get_menu_settings();

    let menu_width = settings.menu_width as f64;
    let submenu_dir = &settings.submenu_direction;

    let window_width = if submenu_dir == "side" {
        menu_width * 3.0 + 40.0
    } else {
        menu_width + 20.0
    };
    let window_height = (settings.menu_height as f64).max(300.0) + 100.0;

    // Get the available work area (excludes taskbar)
    let (work_y, work_h) = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| {
            let pos = m.position();
            let size = m.size();
            (pos.y as f64, size.height as f64)
        })
        .unwrap_or((0.0, 1080.0));

    let popup_x = (x - menu_width / 2.0 + settings.popup_offset_x as f64).max(0.0);
    // Position the popup so its bottom sits just above the click point (tray icon)
    let popup_y = (y - window_height + settings.popup_offset_y as f64)
        .max(work_y)
        .min(work_y + work_h - window_height);

    let settings_json = serde_json::to_value(&settings).unwrap_or_default();
    let payload = serde_json::json!({
        "items": items,
        "settings": settings_json,
    });

    if let Some(popup) = app.get_webview_window("tray-popup") {
        popup.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: popup_x as i32,
            y: popup_y as i32,
        })).ok();
        popup.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: window_width as u32,
            height: window_height as u32,
        })).ok();
        popup.show().ok();
        popup.set_focus().ok();
        app.emit_to("tray-popup", "tray-popup-data", payload).ok();
    } else {
        if let Ok(popup) = WebviewWindowBuilder::new(
            app,
            "tray-popup",
            tauri::WebviewUrl::App("/popup".into()),
        )
        .title("")
        .inner_size(window_width, window_height)
        .position(popup_x, popup_y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .shadow(false)
        .build()
        {
            // Auto-hide when popup loses focus
            let popup_for_focus = popup.clone();
            popup.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    popup_for_focus.hide().ok();
                }
            });

            let app_clone = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(300));
                app_clone
                    .emit_to("tray-popup", "tray-popup-data", payload)
                    .ok();
                if let Some(p) = app_clone.get_webview_window("tray-popup") {
                    p.show().ok();
                    p.set_focus().ok();
                }
            });
        }
    }
}

fn main() {
    // ── Single instance check ────────────────────────────
    // Try to create a lock file; if it already exists and is locked, exit
    let lock_path = dirs::data_dir()
        .unwrap_or_default()
        .join("MenuMaestro")
        .join(".lock");
    std::fs::create_dir_all(lock_path.parent().unwrap()).ok();

    // Use a file we keep open for the lifetime of the process
    let lock_file = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&lock_path);

    let _lock_handle = match lock_file {
        Ok(file) => {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::io::AsRawHandle;
                use winapi::um::fileapi::LockFile;
                let handle = file.as_raw_handle();
                let locked = unsafe { LockFile(handle as *mut _, 0, 0, 1, 0) };
                if locked == 0 {
                    // Another instance is running
                    eprintln!("Menu Maestro is already running.");
                    std::process::exit(0);
                }
            }
            Some(file) // Keep file open = lock held
        }
        Err(_) => None,
    };

    let storage = Storage::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(storage)
        .setup(|app| {
            // ── System Tray ──────────────────────────────────────

            let _tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Menu Maestro")
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        position,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_popup_menu(app, position.x, position.y);
                    }
                })
                .build(app)?;

            // ── Main Window Events ───────────────────────────────
            let app_handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            // Hide to tray instead of closing
                            api.prevent_close();
                            if let Some(win) = app_handle.get_webview_window("main") {
                                win.hide().ok();
                            }
                        }
                        tauri::WindowEvent::DragDrop(drag_event) => {
                            if let tauri::DragDropEvent::Drop { paths, .. } = drag_event {
                                let resolved_paths: Vec<String> = paths
                                    .iter()
                                    .filter_map(|p| {
                                        let path_str = p.to_string_lossy().to_string();

                                        // Skip special shell objects that can crash
                                        if path_str.starts_with("::{") || path_str.contains("::") {
                                            return None;
                                        }

                                        // Check the path actually exists
                                        if !std::path::Path::new(&path_str).exists() {
                                            return None;
                                        }

                                        // Pass .lnk files through as-is — the Windows Shell
                                        // handles them natively with full argument/workdir support
                                        Some(path_str)
                                    })
                                    .collect();

                                if !resolved_paths.is_empty() {
                                    if let Some(window) =
                                        app_handle.get_webview_window("main")
                                    {
                                        window
                                            .emit("native-file-drop", &resolved_paths)
                                            .ok();
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_menu_items,
            commands::create_menu_item,
            commands::update_menu_item,
            commands::delete_menu_item,
            commands::reorder_menu_items,
            commands::reparent_menu_item,
            commands::get_menu_settings,
            commands::update_menu_settings,
            commands::export_data,
            commands::import_data,
            commands::get_profiles,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::reorder_profiles,
            commands::get_profile_menu_items,
            commands::create_profile_menu_item,
            commands::update_profile_menu_item,
            commands::delete_profile_menu_item,
            commands::reorder_profile_menu_items,
            commands::get_profile_settings,
            commands::update_profile_settings,
            commands::launch_item,
            commands::check_path,
            commands::resolve_shortcut,
            commands::get_file_icon,
            commands::refresh_tray,
            commands::quit_app,
            commands::set_launch_at_startup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
