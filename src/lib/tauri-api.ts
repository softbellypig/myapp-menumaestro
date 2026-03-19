// src/lib/tauri-api.ts
// Tauri invoke wrappers — replaces both electron-api.ts and HTTP fetch calls

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

/** Always true in Tauri app */
export function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

// Alias for backward compatibility with components that call isElectron()
export const isElectron = isTauri;

// ─── Menu Items ──────────────────────────────────────────────────────────────

export async function getMenuItems() {
  return invoke<any[]>("get_menu_items");
}

export async function createMenuItem(item: any) {
  return invoke<any>("create_menu_item", { item });
}

export async function updateMenuItem(id: string, updates: any) {
  return invoke<any>("update_menu_item", { id, updates });
}

export async function deleteMenuItem(id: string) {
  return invoke("delete_menu_item", { id });
}

export async function reorderMenuItems(activeId: string, overId: string) {
  return invoke("reorder_menu_items", { activeId, overId });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getMenuSettings() {
  return invoke<any>("get_menu_settings");
}

export async function updateMenuSettings(updates: any) {
  return invoke<any>("update_menu_settings", { updates });
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

export async function exportData() {
  return invoke<any>("export_data");
}

export async function importData(data: any) {
  return invoke("import_data", { data });
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfiles() {
  return invoke<any[]>("get_profiles");
}

export async function createProfile(profile: any) {
  return invoke<any>("create_profile", { profile });
}

export async function updateProfile(id: string, updates: any) {
  return invoke<any>("update_profile", { id, updates });
}

export async function deleteProfile(id: string) {
  return invoke("delete_profile", { id });
}

export async function reorderProfiles(activeId: string, overId: string) {
  return invoke("reorder_profiles", { activeId, overId });
}

// ─── Profile Menu Items ──────────────────────────────────────────────────────

export async function getProfileMenuItems(profileId: string) {
  return invoke<any[]>("get_profile_menu_items", { profileId });
}

export async function createProfileMenuItem(profileId: string, item: any) {
  return invoke<any>("create_profile_menu_item", { profileId, item });
}

export async function updateProfileMenuItem(profileId: string, itemId: string, updates: any) {
  return invoke<any>("update_profile_menu_item", { profileId, itemId, updates });
}

export async function deleteProfileMenuItem(profileId: string, itemId: string) {
  return invoke("delete_profile_menu_item", { profileId, itemId });
}

export async function reorderProfileMenuItems(profileId: string, activeId: string, overId: string) {
  return invoke("reorder_profile_menu_items", { profileId, activeId, overId });
}

// ─── Profile Settings ────────────────────────────────────────────────────────

export async function getProfileSettings(profileId: string) {
  return invoke<any>("get_profile_settings", { profileId });
}

export async function updateProfileSettings(profileId: string, updates: any) {
  return invoke<any>("update_profile_settings", { profileId, updates });
}

// ─── Native OS ───────────────────────────────────────────────────────────────

export async function launchMenuItem(item: { type: string; label?: string | null; shortcutPath?: string | null }) {
  if (item.type === "menu") return; // menus just expand, nothing to launch
  if (item.type === "url" && item.shortcutPath && !isTauri()) {
    window.open(item.shortcutPath, "_blank");
    return;
  }
  return invoke("launch_item", {
    itemType: item.type,
    shortcutPath: item.shortcutPath,
  });
}

export async function checkPath(targetPath: string) {
  return invoke<{ exists: boolean; isDirectory?: boolean; isFile?: boolean }>(
    "check_path",
    { targetPath }
  );
}

export async function resolveShortcut(filePath: string) {
  return invoke<string>("resolve_shortcut", { filePath });
}

export async function getFileIcon(targetPath: string): Promise<string | null> {
  try {
    const result = await invoke<{ success: boolean; icon: string | null }>(
      "get_file_icon",
      { targetPath }
    );
    if (result.success && result.icon) {
      return `custom:${result.icon}`;
    }
  } catch { /* ignore */ }
  return null;
}

/** Open a native file/folder picker dialog */
export async function pickPath(
  type: "program" | "file" | "folder" = "program"
): Promise<string | null> {
  try {
    const selected = await open({
      directory: type === "folder",
      multiple: false,
      title: type === "folder" ? "Select a folder" : "Select a file",
      filters:
        type === "program"
          ? [
              { name: "Executables", extensions: ["exe", "bat", "cmd", "lnk", "ps1", "msi"] },
              { name: "All Files", extensions: ["*"] },
            ]
          : undefined,
    });
    if (selected && typeof selected === "string") {
      return selected;
    }
    return null;
  } catch {
    return null;
  }
}

/** Tell Rust backend to rebuild the tray menu from current data */
export async function refreshTrayMenu() {
  if (isTauri()) {
    return invoke("refresh_tray");
  }
}

// ─── File Drop Events ────────────────────────────────────────────────────────

export function onNativeFileDrop(callback: (paths: string[]) => void) {
  listen<string[]>("native-file-drop", (event) => {
    callback(event.payload);
  });
}
