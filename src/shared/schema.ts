import { z } from "zod";

export interface MenuItem {
  id: string;
  parentId: string | null;
  type: "program" | "file" | "folder" | "separator" | "url" | "menu";
  label: string | null;
  shortcutPath: string | null;
  iconName: string | null;
  iconColor: string | null;
  sortOrder: number;
  isExpanded: boolean | null;
  folderAction: "expand" | "open" | null;
}

export interface MenuSettings {
  id: string;
  fontFamily: string;
  fontSize: number;
  iconSize: number;
  itemSpacing: number;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  menuWidth: number;
  menuHeight: number;
  borderRadius: number;
  separatorColor: string;
  hoverColor: string;
  submenuDirection: "vertical" | "side";
  menuStyle: "none" | "brushed-metal" | "soft-grid" | "frosted-glass" | "gradient";
  borderStyle: "flat" | "soft-shadow" | "neumorphic";
  borderThickness: "none" | "thin" | "thick";
  borderColor: string;
  gradientColorMid: string;
  gradientColorEnd: string;
  launchAtStartup?: boolean;
  submenuDelay?: number;
  popupOffsetX?: number;
  popupOffsetY?: number;
}

export const insertMenuItemSchema = z.object({
  parentId: z.string().nullable().optional(),
  type: z.enum(["program", "file", "folder", "separator", "url", "menu"]),
  label: z.string().nullable().optional(),
  shortcutPath: z.string().nullable().optional(),
  iconName: z.string().nullable().optional(),
  iconColor: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isExpanded: z.boolean().nullable().optional(),
  folderAction: z.enum(["expand", "open"]).nullable().optional(),
});

export const insertMenuSettingsSchema = z.object({
  fontFamily: z.string().default("Inter"),
  fontSize: z.number().int().default(13),
  iconSize: z.number().int().default(16),
  itemSpacing: z.number().int().default(2),
  accentColor: z.string().default("#3b82f6"),
  backgroundColor: z.string().default("#1e1e2e"),
  textColor: z.string().default("#cdd6f4"),
  menuWidth: z.number().int().default(280),
  menuHeight: z.number().int().default(600),
  borderRadius: z.number().int().default(8),
  separatorColor: z.string().default("#45475a"),
  hoverColor: z.string().default("#313244"),
  submenuDirection: z.enum(["vertical", "side"]).default("vertical"),
  menuStyle: z.enum(["none", "brushed-metal", "soft-grid", "frosted-glass", "gradient"]).default("none"),
  borderStyle: z.enum(["flat", "soft-shadow", "neumorphic"]).default("flat"),
  borderThickness: z.enum(["none", "thin", "thick"]).default("thin"),
  borderColor: z.string().default("#45475a"),
  gradientColorMid: z.string().default("#2a2a3e"),
  gradientColorEnd: z.string().default("#3a3a5e"),
  launchAtStartup: z.boolean().default(false),
  submenuDelay: z.number().int().default(300),
  popupOffsetX: z.number().int().default(0),
  popupOffsetY: z.number().int().default(0),
});

export interface MenuProfile {
  id: string;
  name: string;
  iconName: string | null;
  iconColor: string | null;
  showIcon: boolean;
  showText: boolean;
  sortOrder: number;
  menuItems: MenuItem[];
  menuSettings: Omit<MenuSettings, "id">;
}

export const insertProfileSchema = z.object({
  name: z.string().min(1),
  iconName: z.string().nullable().optional(),
  iconColor: z.string().nullable().optional(),
  showIcon: z.boolean().default(true),
  showText: z.boolean().default(true),
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertMenuSettings = z.infer<typeof insertMenuSettingsSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
