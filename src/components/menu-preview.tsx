import { useState } from "react";
import { IconRenderer, getIconType } from "@/components/icon-renderer";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import type { MenuItem, MenuSettings, MenuProfile } from "@shared/schema";
import { buildTree } from "@/lib/menu-store";
import { launchMenuItem, isTauri as isElectron } from "@/lib/tauri-api";
import { cn } from "@/lib/utils";

type TreeItem = MenuItem & { children: TreeItem[] };

function getMenuStyleCSS(settings: Omit<MenuSettings, "id">): React.CSSProperties {
  const style = settings.menuStyle ?? "none";
  const bg = settings.backgroundColor;

  switch (style) {
    case "brushed-metal":
      return {
        backgroundImage: `
          linear-gradient(180deg,
            rgba(255,255,255,0.12) 0%,
            rgba(255,255,255,0.0) 15%,
            rgba(255,255,255,0.06) 30%,
            rgba(255,255,255,0.0) 45%,
            rgba(255,255,255,0.08) 55%,
            rgba(255,255,255,0.0) 70%,
            rgba(255,255,255,0.05) 85%,
            rgba(255,255,255,0.10) 100%
          ),
          repeating-linear-gradient(
            0deg,
            rgba(255,255,255,0.0) 0px,
            rgba(255,255,255,0.04) 1px,
            rgba(200,200,200,0.03) 2px,
            rgba(255,255,255,0.0) 3px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.0) 0px,
            rgba(0,0,0,0.02) 4px,
            rgba(255,255,255,0.02) 5px,
            rgba(0,0,0,0.0) 7px
          ),
          linear-gradient(90deg,
            rgba(0,0,0,0.06) 0%,
            rgba(255,255,255,0.04) 20%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.04) 80%,
            rgba(0,0,0,0.06) 100%
          )
        `,
        backgroundColor: bg,
      };
    case "soft-grid":
      return {
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "12px 12px",
        backgroundColor: bg,
      };
    case "frosted-glass":
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(
          ellipse at 30% 20%,
          rgba(255,255,255,0.08) 0%,
          transparent 50%
        ), radial-gradient(
          ellipse at 70% 80%,
          rgba(255,255,255,0.05) 0%,
          transparent 50%
        )`,
        backdropFilter: "blur(16px)",
      };
    case "gradient": {
      const mid = settings.gradientColorMid ?? "#2a2a3e";
      const end = settings.gradientColorEnd ?? "#3a3a5e";
      return {
        background: `linear-gradient(180deg, ${bg} 0%, ${mid} 50%, ${end} 100%)`,
      };
    }
    default:
      return { backgroundColor: bg };
  }
}

function getBorderCSS(settings: Omit<MenuSettings, "id">): React.CSSProperties {
  const borderStyle = settings.borderStyle ?? "flat";
  const thickness = settings.borderThickness ?? "thin";
  const radius = `${settings.borderRadius}px`;
  const bColor = settings.borderColor ?? settings.separatorColor;

  if (thickness === "none") {
    const base: React.CSSProperties = { border: "none", borderRadius: radius };
    if (borderStyle === "soft-shadow") {
      base.boxShadow = `0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)`;
    } else if (borderStyle === "neumorphic") {
      base.boxShadow = `6px 6px 14px rgba(0,0,0,0.35), -6px -6px 14px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)`;
    }
    return base;
  }

  const borderW = thickness === "thick" ? 2 : 1;

  switch (borderStyle) {
    case "soft-shadow":
      return {
        border: `${borderW}px solid ${bColor}`,
        borderRadius: radius,
        boxShadow: `0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)`,
      };
    case "neumorphic": {
      return {
        border: `${borderW}px solid ${bColor}`,
        borderRadius: radius,
        boxShadow: `6px 6px 14px rgba(0,0,0,0.35), -6px -6px 14px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)`,
      };
    }
    default:
      return {
        border: `${borderW}px solid ${bColor}`,
        borderRadius: radius,
      };
  }
}

interface MenuPreviewProps {
  items: MenuItem[];
  settings: Omit<MenuSettings, "id">;
  profiles?: MenuProfile[];
  activeProfileId?: string | null;
  onProfileClick?: (profileId: string | null) => void;
}

function PreviewItem({
  item,
  settings,
  depth = 0,
  expandedFolders,
  toggleFolder,
  hoveredId,
  setHoveredId,
  sideSubmenu,
}: {
  item: TreeItem;
  settings: Omit<MenuSettings, "id">;
  depth?: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  sideSubmenu: boolean;
}) {
  const isFolder = item.type === "folder";
  const isSeparator = item.type === "separator";
  const folderAction = (item as any).folderAction || "expand";
  const isExpandableFolder = isFolder && folderAction === "expand";
  const isOpenFolder = isFolder && folderAction === "open";
  const isExpanded = expandedFolders.has(item.id);
  const isHovered = hoveredId === item.id;
  const hasShortcutPath = !!(item as any).shortcutPath;
  const isUrl = item.type === "url";
  const iconSize = settings.iconSize ?? 16;

  if (isSeparator) {
    return (
      <div
        className="px-3"
        style={{
          paddingTop: `${settings.itemSpacing + 2}px`,
          paddingBottom: `${settings.itemSpacing + 2}px`,
        }}
      >
        <div
          className="h-px w-full"
          style={{ backgroundColor: settings.separatorColor }}
        />
      </div>
    );
  }

  const handleClick = () => {
    if (isExpandableFolder) {
      toggleFolder(item.id);
      return;
    }

    if (isUrl && hasShortcutPath) {
      const url = (item as any).shortcutPath;
      launchMenuItem({ type: "url", label: item.label ?? undefined, shortcutPath: url });
      return;
    }

    if (hasShortcutPath) {
      launchMenuItem({
        type: item.type,
        label: item.label ?? undefined,
        shortcutPath: (item as any).shortcutPath,
      });
    }
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 cursor-pointer transition-colors"
        style={{
          padding: `${settings.itemSpacing + 4}px 10px`,
          paddingLeft: sideSubmenu ? "10px" : `${depth * 16 + 10}px`,
          backgroundColor: isHovered ? settings.hoverColor : "transparent",
          borderRadius: `${Math.max(settings.borderRadius - 4, 2)}px`,
          margin: "0 4px",
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
          color: settings.textColor,
        }}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => {
          if (!sideSubmenu || !isExpandableFolder) setHoveredId(null);
        }}
        onClick={handleClick}
        title={
          isExpandableFolder
            ? (sideSubmenu ? "Hover to expand" : "Click to expand/collapse")
            : isUrl
            ? `Open URL: ${(item as any).shortcutPath || ""}`
            : hasShortcutPath
            ? `Click to launch: ${(item as any).shortcutPath}`
            : "No path configured"
        }
        data-testid={`preview-item-${item.id}`}
      >
        {!sideSubmenu && isExpandableFolder && (
          <span style={{ color: settings.textColor, opacity: 0.5 }}>
            {isExpanded ? <ChevronDown size={settings.fontSize} /> : <ChevronRight size={settings.fontSize} />}
          </span>
        )}
        <IconRenderer
          name={
            isExpandableFolder && getIconType(item.iconName) === "lucide"
              ? (isExpanded && !sideSubmenu ? "FolderOpen" : "Folder")
              : isUrl && getIconType(item.iconName) === "lucide"
              ? (item.iconName || "Globe")
              : item.iconName
          }
          color={item.iconColor}
          size={iconSize}
        />
        <span className="flex-1 truncate">{item.label}</span>

        {(isUrl || (!isExpandableFolder && hasShortcutPath)) && (
          <ExternalLink
            size={settings.fontSize - 2}
            style={{ color: settings.textColor, opacity: isHovered ? 0.4 : 0 }}
          />
        )}

        {sideSubmenu && isExpandableFolder && item.children.length > 0 && (
          <ChevronRight size={settings.fontSize} style={{ color: settings.textColor, opacity: 0.5 }} />
        )}

        {!sideSubmenu && isExpandableFolder && !isExpanded && item.children.length > 0 && (
          <span
            className="text-[10px] opacity-40 tabular-nums"
            style={{ fontFamily: settings.fontFamily }}
          >
            {item.children.length}
          </span>
        )}
      </div>

      {isExpandableFolder && item.children.length > 0 && !sideSubmenu && isExpanded && (
        <div>
          {item.children.map((child) => (
            <PreviewItem
              key={child.id}
              item={child}
              settings={settings}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              sideSubmenu={false}
            />
          ))}
        </div>
      )}

      {isExpandableFolder && item.children.length > 0 && sideSubmenu && isHovered && (
        <div
          className="absolute"
          style={{
            left: "100%",
            top: 0,
            width: `${settings.menuWidth}px`,
            ...getMenuStyleCSS(settings),
            ...getBorderCSS(settings),
            zIndex: 50,
          }}
          onMouseEnter={() => setHoveredId(item.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="py-2">
            {item.children.map((child) => (
              <PreviewItem
                key={child.id}
                item={child}
                settings={settings}
                depth={0}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
                sideSubmenu={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuPreview({ items, settings, profiles, activeProfileId, onProfileClick }: MenuPreviewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const sideSubmenu = (settings.submenuDirection ?? "vertical") === "side";

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tree = buildTree(items) as TreeItem[];
  const running = isElectron();
  const hasProfiles = profiles && profiles.length > 0;

  return (
    <div className="flex flex-col items-start justify-center h-full p-6 pl-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
          {running ? "Live Menu · Click to Launch" : "Live Preview"}
          {activeProfileId && profiles ? ` · ${profiles.find(p => p.id === activeProfileId)?.name ?? ""}` : ""}
        </span>
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>

      <div
        className="relative"
        style={{
          width: `${settings.menuWidth}px`,
          ...getMenuStyleCSS(settings),
          ...getBorderCSS(settings),
          maxHeight: `${settings.menuHeight ?? 600}px`,
          overflowY: "auto",
          scrollbarGutter: "stable",
        }}
        data-testid="menu-preview-container"
      >
        <div className="py-2">
          {tree.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 text-center"
              style={{
                color: settings.textColor,
                opacity: 0.4,
                fontFamily: settings.fontFamily,
                fontSize: `${settings.fontSize}px`,
              }}
            >
              Empty menu
            </div>
          ) : (
            tree.map((item) => (
              <PreviewItem
                key={item.id}
                item={item}
                settings={settings}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
                sideSubmenu={sideSubmenu}
              />
            ))
          )}
        </div>

        {hasProfiles && (
          <>
            <div
              className="mx-3"
              style={{
                height: "1px",
                backgroundColor: settings.separatorColor,
              }}
            />
            <div
              className="flex flex-wrap gap-1 px-3 py-2"
              data-testid="profile-buttons-container"
            >
              {profiles!.map((profile) => {
                const isActive = activeProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className="flex items-center gap-1.5 cursor-pointer transition-colors"
                    style={{
                      padding: `${(settings.itemSpacing ?? 2) + 3}px 8px`,
                      backgroundColor: isActive ? settings.hoverColor : "transparent",
                      borderRadius: `${Math.max((settings.borderRadius ?? 8) - 4, 2)}px`,
                      fontFamily: settings.fontFamily,
                      fontSize: `${(settings.fontSize ?? 13) - 1}px`,
                      color: settings.textColor,
                      opacity: isActive ? 1 : 0.7,
                    }}
                    onClick={() => onProfileClick?.(isActive ? null : profile.id)}
                    data-testid={`button-profile-${profile.id}`}
                  >
                    {profile.showIcon && (
                      <IconRenderer
                        name={profile.iconName}
                        color={profile.iconColor}
                        size={(settings.iconSize ?? 16) - 2}
                      />
                    )}
                    {profile.showText && (
                      <span className="truncate max-w-[120px]">{profile.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <span
          className="text-[10px] text-muted-foreground/40 font-mono"
          data-testid="text-preview-dimensions"
        >
          {settings.menuWidth}px &middot; {settings.fontFamily} &middot; {settings.fontSize}px
        </span>
      </div>
    </div>
  );
}
