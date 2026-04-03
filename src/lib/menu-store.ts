import type { MenuItem, MenuSettings } from "@shared/schema";

export const DEFAULT_SETTINGS: Omit<MenuSettings, "id"> = {
  fontFamily: "Inter",
  fontSize: 13,
  iconSize: 16,
  itemSpacing: 2,
  accentColor: "#3b82f6",
  backgroundColor: "#1e1e2e",
  textColor: "#cdd6f4",
  menuWidth: 280,
  menuHeight: 600,
  borderRadius: 8,
  separatorColor: "#45475a",
  hoverColor: "#313244",
  submenuDirection: "vertical",
  menuStyle: "none",
  borderStyle: "flat",
  borderThickness: "thin",
  borderColor: "#45475a",
  gradientColorMid: "#2a2a3e",
  gradientColorEnd: "#3a3a5e",
  gradientType: "linear",
};

export const ICON_OPTIONS = [
  "Terminal", "Monitor", "FileText", "Folder", "FolderOpen",
  "Globe", "Mail", "Music", "Image", "Video",
  "Camera", "Headphones", "Gamepad2", "Code", "Database",
  "Settings", "Wrench", "Paintbrush", "Palette", "Layers",
  "Layout", "Grid3x3", "Calculator", "Calendar", "Clock",
  "MessageSquare", "Phone", "Wifi", "Bluetooth", "Cpu",
  "HardDrive", "Printer", "Download", "Upload", "Share2",
  "BookOpen", "Bookmark", "Star", "Heart", "Zap",
  "Shield", "Lock", "Key", "Search", "Eye",
  "Map", "Navigation", "Compass", "Cloud", "Sun",
] as const;

export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "Fira Code", label: "Fira Code" },
  { value: "Source Code Pro", label: "Source Code Pro" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans" },
];

export function canHaveChildren(type: string): boolean {
  return type === "menu" || type === "folder";
}

export function buildTree(items: MenuItem[]): (MenuItem & { children: MenuItem[] })[] {
  const map = new Map<string | null, MenuItem[]>();
  items.forEach((item) => {
    const pid = item.parentId || null;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(item);
  });
  const getChildren = (parentId: string | null): (MenuItem & { children: MenuItem[] })[] => {
    const children = map.get(parentId) || [];
    return children
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        ...item,
        children: canHaveChildren(item.type) ? getChildren(item.id) : [],
      }));
  };
  return getChildren(null);
}
