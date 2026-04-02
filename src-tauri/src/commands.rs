use crate::storage::{InsertMenuItem, InsertProfile, MenuItem, MenuProfile, MenuSettings, Storage, StorageData};
use serde_json::Value;
use std::process::Command;
use tauri::{AppHandle, State};

/// Refresh tray - the popup will get fresh data on next open
#[tauri::command]
pub fn refresh_tray(_app: AppHandle, _storage: State<Storage>) {
    // The popup window fetches fresh data each time it's shown,
    // so nothing to do here. Keeping the command for API compatibility.
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn set_launch_at_startup(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use winapi::um::winreg::{RegSetValueExW, RegDeleteValueW, RegOpenKeyExW, RegCloseKey, HKEY_CURRENT_USER};
        use winapi::um::winnt::KEY_WRITE;
        use std::ptr;

        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        let sub_key: Vec<u16> = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\0"
            .encode_utf16()
            .collect();
        let value_name: Vec<u16> = "MenuMaestro\0".encode_utf16().collect();

        unsafe {
            let mut hkey: winapi::shared::minwindef::HKEY = ptr::null_mut();
            let result = RegOpenKeyExW(
                HKEY_CURRENT_USER,
                sub_key.as_ptr(),
                0,
                KEY_WRITE,
                &mut hkey,
            );
            if result != 0 {
                return Err("Failed to open registry key".into());
            }

            if enabled {
                let exe_wide: Vec<u16> = format!("\"{}\"\0", exe_path).encode_utf16().collect();
                RegSetValueExW(
                    hkey,
                    value_name.as_ptr(),
                    0,
                    1, // REG_SZ
                    exe_wide.as_ptr() as *const u8,
                    (exe_wide.len() * 2) as u32,
                );
            } else {
                RegDeleteValueW(hkey, value_name.as_ptr());
            }
            RegCloseKey(hkey);
        }
    }
    Ok(())
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_menu_items(storage: State<Storage>) -> Vec<MenuItem> {
    storage.get_menu_items()
}

#[tauri::command]
pub fn create_menu_item(storage: State<Storage>, item: InsertMenuItem) -> MenuItem {
    storage.create_menu_item(item)
}

#[tauri::command]
pub fn update_menu_item(
    storage: State<Storage>,
    id: String,
    updates: Value,
) -> Option<MenuItem> {
    storage.update_menu_item(&id, updates)
}

#[tauri::command]
pub fn delete_menu_item(storage: State<Storage>, id: String) {
    storage.delete_menu_item(&id);
}

#[tauri::command]
pub fn reorder_menu_items(storage: State<Storage>, active_id: String, over_id: String) {
    storage.reorder_menu_items(&active_id, &over_id);
}

#[tauri::command]
pub fn reparent_menu_item(storage: State<Storage>, item_id: String, new_parent_id: Option<String>) {
    storage.reparent_menu_item(&item_id, new_parent_id.as_deref());
}

// ─── Settings ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_menu_settings(storage: State<Storage>) -> MenuSettings {
    storage.get_menu_settings()
}

#[tauri::command]
pub fn update_menu_settings(storage: State<Storage>, updates: Value) -> MenuSettings {
    storage.update_menu_settings(updates)
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_data(storage: State<Storage>) -> StorageData {
    storage.export_data()
}

#[tauri::command]
pub fn import_data(storage: State<Storage>, data: StorageData) -> Result<(), String> {
    storage.import_data(data);
    Ok(())
}

// ─── Profiles ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_profiles(storage: State<Storage>) -> Vec<MenuProfile> {
    storage.get_profiles()
}

#[tauri::command]
pub fn create_profile(storage: State<Storage>, profile: InsertProfile) -> MenuProfile {
    storage.create_profile(profile)
}

#[tauri::command]
pub fn update_profile(storage: State<Storage>, id: String, updates: Value) -> Option<MenuProfile> {
    storage.update_profile(&id, updates)
}

#[tauri::command]
pub fn delete_profile(storage: State<Storage>, id: String) {
    storage.delete_profile(&id);
}

#[tauri::command]
pub fn reorder_profiles(storage: State<Storage>, active_id: String, over_id: String) {
    storage.reorder_profiles(&active_id, &over_id);
}

// ─── Profile Menu Items ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_profile_menu_items(storage: State<Storage>, profile_id: String) -> Vec<MenuItem> {
    storage.get_profile_menu_items(&profile_id)
}

#[tauri::command]
pub fn create_profile_menu_item(
    storage: State<Storage>,
    profile_id: String,
    item: InsertMenuItem,
) -> Option<MenuItem> {
    storage.create_profile_menu_item(&profile_id, item)
}

#[tauri::command]
pub fn update_profile_menu_item(
    storage: State<Storage>,
    profile_id: String,
    item_id: String,
    updates: Value,
) -> Option<MenuItem> {
    storage.update_profile_menu_item(&profile_id, &item_id, updates)
}

#[tauri::command]
pub fn delete_profile_menu_item(storage: State<Storage>, profile_id: String, item_id: String) {
    storage.delete_profile_menu_item(&profile_id, &item_id);
}

#[tauri::command]
pub fn reorder_profile_menu_items(
    storage: State<Storage>,
    profile_id: String,
    active_id: String,
    over_id: String,
) {
    storage.reorder_profile_menu_items(&profile_id, &active_id, &over_id);
}

// ─── Profile Settings ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_profile_settings(storage: State<Storage>, profile_id: String) -> Option<Value> {
    storage.get_profile_settings(&profile_id)
}

#[tauri::command]
pub fn update_profile_settings(
    storage: State<Storage>,
    profile_id: String,
    updates: Value,
) -> Option<Value> {
    storage.update_profile_settings(&profile_id, updates)
}

// ─── Native OS Commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn launch_item(item_type: String, shortcut_path: Option<String>) -> Result<(), String> {
    let path = shortcut_path.ok_or("No path specified")?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        match item_type.as_str() {
            "folder" => {
                Command::new("explorer")
                    .arg(&path)
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
            _ => {
                Command::new("cmd")
                    .args(["/C", "start", "", &path])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
        }
    }

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Check if a path exists and whether it's a file or directory
#[tauri::command]
pub fn check_path(target_path: String) -> Value {
    let metadata = std::fs::metadata(&target_path);
    match metadata {
        Ok(meta) => serde_json::json!({
            "exists": true,
            "isDirectory": meta.is_dir(),
            "isFile": meta.is_file(),
        }),
        Err(_) => serde_json::json!({
            "exists": false,
        }),
    }
}

/// Resolve a .lnk shortcut to its target path (Windows only).
/// Returns the original path if resolution fails — callers can
/// still launch .lnk files directly via the Windows Shell.
#[tauri::command]
pub fn resolve_shortcut(file_path: String) -> String {
    #[cfg(target_os = "windows")]
    {
        if file_path.to_lowercase().ends_with(".lnk") {
            // Wrap in catch_unwind — the lnk crate can panic on malformed files
            let fp = file_path.clone();
            if let Ok(Some(resolved)) = std::panic::catch_unwind(move || -> Option<String> {
                let lnk = lnk::ShellLink::open(&fp).ok()?;
                if let Some(target) = lnk.link_info() {
                    if let Some(path) = target.local_base_path() {
                        let p = path.to_string();
                        if !p.is_empty() && std::path::Path::new(&p).exists() {
                            return Some(p);
                        }
                    }
                }
                if let Some(rel) = lnk.relative_path() {
                    let r = rel.to_string();
                    if !r.is_empty() && std::path::Path::new(&r).exists() {
                        return Some(r);
                    }
                }
                None
            }) {
                return resolved;
            }
        }
    }
    file_path
}

/// Get file icon as base64 PNG
#[tauri::command]
pub fn get_file_icon(target_path: String) -> Value {
    #[cfg(target_os = "windows")]
    {
        match extract_icon_windows(&target_path) {
            Some(base64_png) => {
                return serde_json::json!({
                    "success": true,
                    "icon": base64_png
                });
            }
            None => {}
        }
    }

    serde_json::json!({
        "success": false,
        "icon": null
    })
}

#[cfg(target_os = "windows")]
fn extract_icon_windows(path: &str) -> Option<String> {
    // Resolve .lnk to target so we get the real icon without shortcut overlay
    let resolved = if path.to_lowercase().ends_with(".lnk") {
        lnk::ShellLink::open(path).ok()
            .and_then(|lnk| {
                lnk.link_info()
                    .as_ref()
                    .and_then(|i| i.local_base_path().as_ref().map(|p| p.to_string()))
            })
            .unwrap_or_else(|| path.to_string())
    } else {
        path.to_string()
    };
    let path = &resolved;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;
    use winapi::um::shellapi::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use winapi::um::winuser::{DestroyIcon, GetIconInfo, ICONINFO};
    use winapi::um::wingdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, SelectObject,
        BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use winapi::shared::windef::HBITMAP;

    unsafe {
        // Convert path to wide string
        let wide_path: Vec<u16> = OsStr::new(path).encode_wide().chain(Some(0)).collect();

        // Get icon handle via SHGetFileInfoW
        let mut shfi: SHFILEINFOW = std::mem::zeroed();
        let result = SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut shfi,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );

        if result == 0 || shfi.hIcon.is_null() {
            return None;
        }

        let hicon = shfi.hIcon;

        // Get icon info to access the bitmap
        let mut icon_info: ICONINFO = std::mem::zeroed();
        if GetIconInfo(hicon, &mut icon_info) == 0 {
            DestroyIcon(hicon);
            return None;
        }

        let hbm_color: HBITMAP = icon_info.hbmColor;
        let hbm_mask: HBITMAP = icon_info.hbmMask;

        if hbm_color.is_null() {
            DestroyIcon(hicon);
            if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
            return None;
        }

        // Get bitmap dimensions
        let mut bmp_info: BITMAPINFO = std::mem::zeroed();
        bmp_info.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;

        let hdc = CreateCompatibleDC(ptr::null_mut());
        let old_bmp = SelectObject(hdc, hbm_color as _);

        // First call to get dimensions
        GetDIBits(hdc, hbm_color, 0, 0, ptr::null_mut(), &mut bmp_info, DIB_RGB_COLORS);

        let width = bmp_info.bmiHeader.biWidth;
        let height = bmp_info.bmiHeader.biHeight.abs();

        if width == 0 || height == 0 {
            SelectObject(hdc, old_bmp);
            DeleteDC(hdc);
            DeleteObject(hbm_color as _);
            if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
            DestroyIcon(hicon);
            return None;
        }

        // Set up for 32-bit BGRA extraction
        bmp_info.bmiHeader.biBitCount = 32;
        bmp_info.bmiHeader.biCompression = BI_RGB;
        bmp_info.bmiHeader.biHeight = -height; // top-down
        bmp_info.bmiHeader.biSizeImage = (width * height * 4) as u32;
        bmp_info.bmiHeader.biPlanes = 1;

        let mut pixels: Vec<u8> = vec![0u8; (width * height * 4) as usize];

        let rows = GetDIBits(
            hdc,
            hbm_color,
            0,
            height as u32,
            pixels.as_mut_ptr() as _,
            &mut bmp_info,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc, old_bmp);
        DeleteDC(hdc);
        DeleteObject(hbm_color as _);
        if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
        DestroyIcon(hicon);

        if rows == 0 {
            return None;
        }

        // Convert BGRA to RGBA
        for i in (0..pixels.len()).step_by(4) {
            pixels.swap(i, i + 2); // B <-> R
        }

        // Encode as PNG using the image crate
        let img = image::RgbaImage::from_raw(width as u32, height as u32, pixels)?;
        let mut png_bytes: Vec<u8> = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        image::ImageEncoder::write_image(
            encoder,
            img.as_raw(),
            width as u32,
            height as u32,
            image::ExtendedColorType::Rgba8,
        ).ok()?;

        let b64 = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &png_bytes,
        );
        Some(format!("data:image/png;base64,{}", b64))
    }
}
