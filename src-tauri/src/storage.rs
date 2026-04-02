use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

// ─── Data Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItem {
    pub id: String,
    pub parent_id: Option<String>,
    #[serde(rename = "type")]
    pub item_type: String,
    pub label: Option<String>,
    pub shortcut_path: Option<String>,
    pub icon_name: Option<String>,
    pub icon_color: Option<String>,
    pub sort_order: i32,
    pub is_expanded: Option<bool>,
    pub folder_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuSettings {
    pub id: String,
    pub font_family: String,
    pub font_size: i32,
    pub icon_size: i32,
    pub item_spacing: i32,
    pub accent_color: String,
    pub background_color: String,
    pub text_color: String,
    pub menu_width: i32,
    #[serde(default = "default_menu_height")]
    pub menu_height: i32,
    pub border_radius: i32,
    pub separator_color: String,
    pub hover_color: String,
    pub submenu_direction: String,
    pub menu_style: String,
    pub border_style: String,
    pub border_thickness: String,
    pub border_color: String,
    pub gradient_color_mid: String,
    pub gradient_color_end: String,
    #[serde(default = "default_false")]
    pub launch_at_startup: bool,
    #[serde(default = "default_submenu_delay")]
    pub submenu_delay: i32,
    #[serde(default)]
    pub popup_offset_x: i32,
    #[serde(default)]
    pub popup_offset_y: i32,
    #[serde(default = "default_false")]
    pub hide_shortcut_arrows: bool,
}

fn default_false() -> bool { false }
fn default_submenu_delay() -> i32 { 300 }
fn default_menu_height() -> i32 { 600 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuProfile {
    pub id: String,
    pub name: String,
    pub icon_name: Option<String>,
    pub icon_color: Option<String>,
    pub show_icon: bool,
    pub show_text: bool,
    pub sort_order: i32,
    pub menu_items: Vec<MenuItem>,
    pub menu_settings: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageData {
    pub menu_items: Vec<MenuItem>,
    pub menu_settings: MenuSettings,
    #[serde(default)]
    pub profiles: Vec<MenuProfile>,
}

// ─── Insert types (subset for creating) ──────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertMenuItem {
    pub parent_id: Option<String>,
    #[serde(rename = "type")]
    pub item_type: String,
    pub label: Option<String>,
    pub shortcut_path: Option<String>,
    pub icon_name: Option<String>,
    pub icon_color: Option<String>,
    #[allow(dead_code)]
    pub sort_order: Option<i32>,
    pub is_expanded: Option<bool>,
    pub folder_action: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertProfile {
    pub name: String,
    pub icon_name: Option<String>,
    pub icon_color: Option<String>,
    pub show_icon: Option<bool>,
    pub show_text: Option<bool>,
}

// ─── Storage Implementation ──────────────────────────────────────────────────

fn default_settings() -> MenuSettings {
    MenuSettings {
        id: Uuid::new_v4().to_string(),
        font_family: "Inter".into(),
        font_size: 13,
        icon_size: 16,
        item_spacing: 2,
        accent_color: "#3b82f6".into(),
        background_color: "#1e1e2e".into(),
        text_color: "#cdd6f4".into(),
        menu_width: 280,
        menu_height: 600,
        border_radius: 8,
        separator_color: "#45475a".into(),
        hover_color: "#313244".into(),
        submenu_direction: "vertical".into(),
        menu_style: "none".into(),
        border_style: "flat".into(),
        border_thickness: "thin".into(),
        border_color: "#45475a".into(),
        gradient_color_mid: "#2a2a3e".into(),
        gradient_color_end: "#3a3a5e".into(),
        launch_at_startup: false,
        submenu_delay: 300,
        popup_offset_x: 0,
        popup_offset_y: 0,
    }
}

fn data_file_path() -> PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("MenuMaestro");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("trayforge.json")
}

fn load_data() -> StorageData {
    let path = data_file_path();
    if path.exists() {
        if let Ok(contents) = fs::read_to_string(&path) {
            if let Ok(data) = serde_json::from_str::<StorageData>(&contents) {
                return data;
            }
        }
    }
    StorageData {
        menu_items: vec![],
        menu_settings: default_settings(),
        profiles: vec![],
    }
}

fn save_data(data: &StorageData) {
    let path = data_file_path();
    if let Ok(json) = serde_json::to_string_pretty(data) {
        fs::write(path, json).ok();
    }
}

pub struct Storage {
    pub data: Mutex<StorageData>,
}

impl Storage {
    pub fn new() -> Self {
        Storage {
            data: Mutex::new(load_data()),
        }
    }

    pub fn save(&self) {
        let data = self.data.lock().unwrap();
        save_data(&data);
    }

    // ─── Menu Items ──────────────────────────────────────

    pub fn get_menu_items(&self) -> Vec<MenuItem> {
        let data = self.data.lock().unwrap();
        let mut items = data.menu_items.clone();
        items.sort_by_key(|i| i.sort_order);
        items
    }

    pub fn create_menu_item(&self, item: InsertMenuItem) -> MenuItem {
        let mut data = self.data.lock().unwrap();
        let siblings: Vec<&MenuItem> = data
            .menu_items
            .iter()
            .filter(|i| i.parent_id == item.parent_id)
            .collect();
        let max_order = siblings.iter().map(|i| i.sort_order).max().unwrap_or(-1);

        let new_item = MenuItem {
            id: Uuid::new_v4().to_string(),
            parent_id: item.parent_id,
            item_type: item.item_type,
            label: item.label,
            shortcut_path: item.shortcut_path,
            icon_name: item.icon_name,
            icon_color: item.icon_color,
            sort_order: max_order + 1,
            is_expanded: item.is_expanded.or(Some(false)),
            folder_action: item.folder_action,
        };

        data.menu_items.push(new_item.clone());
        drop(data);
        self.save();
        new_item
    }

    pub fn update_menu_item(
        &self,
        id: &str,
        updates: serde_json::Value,
    ) -> Option<MenuItem> {
        let mut data = self.data.lock().unwrap();
        let idx = data.menu_items.iter().position(|i| i.id == id)?;
        let mut item_json = serde_json::to_value(&data.menu_items[idx]).ok()?;
        if let (Some(obj), Some(upd)) = (item_json.as_object_mut(), updates.as_object()) {
            for (k, v) in upd {
                obj.insert(k.clone(), v.clone());
            }
        }
        let updated: MenuItem = serde_json::from_value(item_json).ok()?;
        data.menu_items[idx] = updated.clone();
        drop(data);
        self.save();
        Some(updated)
    }

    pub fn delete_menu_item(&self, id: &str) {
        let data = self.data.lock().unwrap();
        // Recursively delete children
        let child_ids: Vec<String> = data
            .menu_items
            .iter()
            .filter(|i| i.parent_id.as_deref() == Some(id))
            .map(|i| i.id.clone())
            .collect();
        drop(data);
        for child_id in child_ids {
            self.delete_menu_item(&child_id);
        }
        let mut data = self.data.lock().unwrap();
        data.menu_items.retain(|i| i.id != id);
        drop(data);
        self.save();
    }

    pub fn reorder_menu_items(&self, active_id: &str, over_id: &str) {
        let mut data = self.data.lock().unwrap();
        let active_item = data.menu_items.iter().find(|i| i.id == active_id);
        if active_item.is_none() {
            return;
        }
        let parent_id = active_item.unwrap().parent_id.clone();

        let mut siblings: Vec<&mut MenuItem> = data
            .menu_items
            .iter_mut()
            .filter(|i| i.parent_id == parent_id)
            .collect();
        siblings.sort_by_key(|i| i.sort_order);

        let old_idx = siblings.iter().position(|i| i.id == active_id);
        let new_idx = siblings.iter().position(|i| i.id == over_id);
        if let (Some(old), Some(new)) = (old_idx, new_idx) {
            let ids: Vec<String> = siblings.iter().map(|i| i.id.clone()).collect();
            let mut reordered = ids.clone();
            let moved = reordered.remove(old);
            reordered.insert(new, moved);

            for (i, sid) in reordered.iter().enumerate() {
                if let Some(item) = siblings.iter_mut().find(|s| s.id == *sid) {
                    item.sort_order = i as i32;
                }
            }
        }
        drop(data);
        self.save();
    }

    pub fn reparent_menu_item(&self, item_id: &str, new_parent_id: Option<&str>) {
        let mut data = self.data.lock().unwrap();
        let new_parent = new_parent_id.map(|s| s.to_string());
        let max_order = data
            .menu_items
            .iter()
            .filter(|i| i.parent_id == new_parent)
            .map(|i| i.sort_order)
            .max()
            .unwrap_or(-1);

        if let Some(item) = data.menu_items.iter_mut().find(|i| i.id == item_id) {
            item.parent_id = new_parent;
            item.sort_order = max_order + 1;
        }
        drop(data);
        self.save();
    }

    // ─── Settings ────────────────────────────────────────

    pub fn get_menu_settings(&self) -> MenuSettings {
        self.data.lock().unwrap().menu_settings.clone()
    }

    pub fn update_menu_settings(&self, updates: serde_json::Value) -> MenuSettings {
        let mut data = self.data.lock().unwrap();
        let mut settings_json = serde_json::to_value(&data.menu_settings).unwrap();
        if let (Some(obj), Some(upd)) = (settings_json.as_object_mut(), updates.as_object()) {
            for (k, v) in upd {
                obj.insert(k.clone(), v.clone());
            }
        }
        if let Ok(updated) = serde_json::from_value::<MenuSettings>(settings_json) {
            data.menu_settings = updated;
        }
        let result = data.menu_settings.clone();
        drop(data);
        self.save();
        result
    }

    // ─── Export / Import ─────────────────────────────────

    pub fn export_data(&self) -> StorageData {
        self.data.lock().unwrap().clone()
    }

    pub fn import_data(&self, new_data: StorageData) {
        let mut data = self.data.lock().unwrap();
        *data = new_data;
        drop(data);
        self.save();
    }

    // ─── Profiles ────────────────────────────────────────

    pub fn get_profiles(&self) -> Vec<MenuProfile> {
        let data = self.data.lock().unwrap();
        let mut profiles = data.profiles.clone();
        profiles.sort_by_key(|p| p.sort_order);
        profiles
    }

    pub fn create_profile(&self, profile: InsertProfile) -> MenuProfile {
        let mut data = self.data.lock().unwrap();
        let max_order = data.profiles.iter().map(|p| p.sort_order).max().unwrap_or(-1);
        let new_profile = MenuProfile {
            id: Uuid::new_v4().to_string(),
            name: profile.name,
            icon_name: profile.icon_name,
            icon_color: profile.icon_color,
            show_icon: profile.show_icon.unwrap_or(true),
            show_text: profile.show_text.unwrap_or(true),
            sort_order: max_order + 1,
            menu_items: vec![],
            menu_settings: serde_json::to_value(&default_settings()).unwrap(),
        };
        data.profiles.push(new_profile.clone());
        drop(data);
        self.save();
        new_profile
    }

    pub fn update_profile(&self, id: &str, updates: serde_json::Value) -> Option<MenuProfile> {
        let mut data = self.data.lock().unwrap();
        let idx = data.profiles.iter().position(|p| p.id == id)?;
        let mut profile_json = serde_json::to_value(&data.profiles[idx]).ok()?;
        if let (Some(obj), Some(upd)) = (profile_json.as_object_mut(), updates.as_object()) {
            for (k, v) in upd {
                obj.insert(k.clone(), v.clone());
            }
        }
        let updated: MenuProfile = serde_json::from_value(profile_json).ok()?;
        data.profiles[idx] = updated.clone();
        drop(data);
        self.save();
        Some(updated)
    }

    pub fn delete_profile(&self, id: &str) {
        let mut data = self.data.lock().unwrap();
        data.profiles.retain(|p| p.id != id);
        drop(data);
        self.save();
    }

    pub fn reorder_profiles(&self, active_id: &str, over_id: &str) {
        let mut data = self.data.lock().unwrap();
        let mut profiles = data.profiles.clone();
        profiles.sort_by_key(|p| p.sort_order);
        let old_idx = profiles.iter().position(|p| p.id == active_id);
        let new_idx = profiles.iter().position(|p| p.id == over_id);
        if let (Some(old), Some(new)) = (old_idx, new_idx) {
            let moved = profiles.remove(old);
            profiles.insert(new, moved);
            for (i, p) in profiles.iter_mut().enumerate() {
                p.sort_order = i as i32;
            }
            data.profiles = profiles;
        }
        drop(data);
        self.save();
    }

    // ─── Profile-scoped Menu Items ───────────────────────

    pub fn get_profile_menu_items(&self, profile_id: &str) -> Vec<MenuItem> {
        let data = self.data.lock().unwrap();
        if let Some(profile) = data.profiles.iter().find(|p| p.id == profile_id) {
            let mut items = profile.menu_items.clone();
            items.sort_by_key(|i| i.sort_order);
            return items;
        }
        vec![]
    }

    pub fn create_profile_menu_item(&self, profile_id: &str, item: InsertMenuItem) -> Option<MenuItem> {
        let mut data = self.data.lock().unwrap();
        let profile = data.profiles.iter_mut().find(|p| p.id == profile_id)?;
        let siblings: Vec<&MenuItem> = profile
            .menu_items
            .iter()
            .filter(|i| i.parent_id == item.parent_id)
            .collect();
        let max_order = siblings.iter().map(|i| i.sort_order).max().unwrap_or(-1);

        let new_item = MenuItem {
            id: Uuid::new_v4().to_string(),
            parent_id: item.parent_id,
            item_type: item.item_type,
            label: item.label,
            shortcut_path: item.shortcut_path,
            icon_name: item.icon_name,
            icon_color: item.icon_color,
            sort_order: max_order + 1,
            is_expanded: item.is_expanded.or(Some(false)),
            folder_action: item.folder_action,
        };

        profile.menu_items.push(new_item.clone());
        drop(data);
        self.save();
        Some(new_item)
    }

    pub fn update_profile_menu_item(
        &self,
        profile_id: &str,
        item_id: &str,
        updates: serde_json::Value,
    ) -> Option<MenuItem> {
        let mut data = self.data.lock().unwrap();
        let profile = data.profiles.iter_mut().find(|p| p.id == profile_id)?;
        let idx = profile.menu_items.iter().position(|i| i.id == item_id)?;
        let mut item_json = serde_json::to_value(&profile.menu_items[idx]).ok()?;
        if let (Some(obj), Some(upd)) = (item_json.as_object_mut(), updates.as_object()) {
            for (k, v) in upd {
                obj.insert(k.clone(), v.clone());
            }
        }
        let updated: MenuItem = serde_json::from_value(item_json).ok()?;
        profile.menu_items[idx] = updated.clone();
        drop(data);
        self.save();
        Some(updated)
    }

    pub fn delete_profile_menu_item(&self, profile_id: &str, item_id: &str) {
        let mut data = self.data.lock().unwrap();
        if let Some(profile) = data.profiles.iter_mut().find(|p| p.id == profile_id) {
            // Recursive delete
            let child_ids: Vec<String> = profile
                .menu_items
                .iter()
                .filter(|i| i.parent_id.as_deref() == Some(item_id))
                .map(|i| i.id.clone())
                .collect();
            drop(data);
            for cid in child_ids {
                self.delete_profile_menu_item(profile_id, &cid);
            }
            let mut data = self.data.lock().unwrap();
            if let Some(profile) = data.profiles.iter_mut().find(|p| p.id == profile_id) {
                profile.menu_items.retain(|i| i.id != item_id);
            }
            drop(data);
            self.save();
        }
    }

    pub fn reorder_profile_menu_items(&self, profile_id: &str, active_id: &str, over_id: &str) {
        let mut data = self.data.lock().unwrap();
        if let Some(profile) = data.profiles.iter_mut().find(|p| p.id == profile_id) {
            let active_parent = profile
                .menu_items
                .iter()
                .find(|i| i.id == active_id)
                .map(|i| i.parent_id.clone());
            if active_parent.is_none() {
                return;
            }
            let parent_id = active_parent.unwrap();

            let mut siblings: Vec<&mut MenuItem> = profile
                .menu_items
                .iter_mut()
                .filter(|i| i.parent_id == parent_id)
                .collect();
            siblings.sort_by_key(|i| i.sort_order);

            let old_idx = siblings.iter().position(|i| i.id == active_id);
            let new_idx = siblings.iter().position(|i| i.id == over_id);
            if let (Some(old), Some(new)) = (old_idx, new_idx) {
                let ids: Vec<String> = siblings.iter().map(|i| i.id.clone()).collect();
                let mut reordered = ids;
                let moved = reordered.remove(old);
                reordered.insert(new, moved);
                for (i, sid) in reordered.iter().enumerate() {
                    if let Some(item) = siblings.iter_mut().find(|s| s.id == *sid) {
                        item.sort_order = i as i32;
                    }
                }
            }
        }
        drop(data);
        self.save();
    }

    // ─── Profile Settings ────────────────────────────────

    pub fn get_profile_settings(&self, profile_id: &str) -> Option<serde_json::Value> {
        let data = self.data.lock().unwrap();
        data.profiles
            .iter()
            .find(|p| p.id == profile_id)
            .map(|p| p.menu_settings.clone())
    }

    pub fn update_profile_settings(
        &self,
        profile_id: &str,
        updates: serde_json::Value,
    ) -> Option<serde_json::Value> {
        let mut data = self.data.lock().unwrap();
        let profile = data.profiles.iter_mut().find(|p| p.id == profile_id)?;
        if let (Some(obj), Some(upd)) = (
            profile.menu_settings.as_object_mut(),
            updates.as_object(),
        ) {
            for (k, v) in upd {
                obj.insert(k.clone(), v.clone());
            }
        }
        let result = profile.menu_settings.clone();
        drop(data);
        self.save();
        Some(result)
    }
}
