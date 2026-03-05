import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { IconRenderer, getIconType } from "@/components/icon-renderer";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { launchMenuItem } from "@/lib/tauri-api";
import { buildTree } from "@/lib/menu-store";
import type { MenuItem, MenuSettings } from "@shared/schema";

type TreeItem = MenuItem & { children: TreeItem[] };

function getMenuStyleCSS(s: Omit<MenuSettings, "id">): React.CSSProperties {
  const bg = s.backgroundColor;
  switch (s.menuStyle ?? "none") {
    case "brushed-metal":
      return {
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 85%, rgba(255,255,255,0.1) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.04) 1px, rgba(200,200,200,0.03) 2px, rgba(255,255,255,0) 3px)`,
        backgroundColor: bg,
      };
    case "soft-grid":
      return {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "12px 12px", backgroundColor: bg,
      };
    case "frosted-glass":
      return { backgroundColor: bg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" };
    case "gradient":
      return { background: `linear-gradient(180deg, ${bg} 0%, ${s.gradientColorMid ?? "#2a2a3e"} 50%, ${s.gradientColorEnd ?? "#3a3a5e"} 100%)` };
    default:
      return { backgroundColor: bg };
  }
}

function getBorderCSS(s: Omit<MenuSettings, "id">): React.CSSProperties {
  const color = s.borderColor ?? "#45475a";
  const radius = s.borderRadius ?? 8;
  const bw = s.borderThickness === "none" ? 0 : s.borderThickness === "thick" ? 2 : 1;
  const base: React.CSSProperties = { borderRadius: `${radius}px` };
  switch (s.borderStyle ?? "flat") {
    case "soft-shadow":
      return { ...base, border: `${bw}px solid ${color}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)" };
    case "neumorphic":
      return { ...base, border: `${bw}px solid ${color}`, boxShadow: "6px 6px 16px rgba(0,0,0,0.3), -6px -6px 16px rgba(255,255,255,0.05)" };
    default:
      return { ...base, border: bw > 0 ? `${bw}px solid ${color}` : "none" };
  }
}

// ────────────────────────────────────────────────────────────────
// Submenu item with proper hover bridge for side expansion
// ────────────────────────────────────────────────────────────────

function PopupItem({
  item, settings, depth = 0, sideSubmenu, onLaunch,
}: {
  item: TreeItem;
  settings: Omit<MenuSettings, "id">;
  depth?: number;
  sideSubmenu: boolean;
  onLaunch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFolder = item.type === "folder";
  const isMenu = item.type === "menu";
  const isSep = item.type === "separator";
  const folderAction = (item as any).folderAction || "expand";
  const isExpandable = isMenu || (isFolder && folderAction === "expand");
  const hasPath = !!(item as any).shortcutPath;
  const isUrl = item.type === "url";
  const iconSize = settings.iconSize ?? 16;

  const cancelClose = () => {
    if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; }
  };

  const scheduleClose = (ms: number) => {
    cancelClose();
    closeRef.current = setTimeout(() => setShowSub(false), ms);
  };

  // Clean up timer on unmount
  useEffect(() => () => cancelClose(), []);

  if (isSep) {
    return (
      <div className="px-3" style={{ paddingTop: `${settings.itemSpacing + 2}px`, paddingBottom: `${settings.itemSpacing + 2}px` }}>
        <div className="h-px w-full" style={{ backgroundColor: settings.separatorColor }} />
      </div>
    );
  }

  const handleClick = () => {
    if (isExpandable && !sideSubmenu) { setExpanded(!expanded); return; }
    if (hasPath) {
      launchMenuItem({ type: item.type, label: item.label ?? undefined, shortcutPath: (item as any).shortcutPath });
      onLaunch();
    }
  };

  return (
    <div style={{ position: sideSubmenu && isExpandable ? "relative" : undefined }}>
      {/* The item row */}
      <div
        className="flex items-center gap-2 cursor-pointer transition-colors"
        style={{
          padding: `${settings.itemSpacing + 4}px 10px`,
          paddingLeft: sideSubmenu ? "10px" : `${depth * 16 + 10}px`,
          backgroundColor: (hovered || showSub) ? settings.hoverColor : "transparent",
          borderRadius: `${Math.max(settings.borderRadius - 4, 2)}px`,
          margin: "0 4px",
          fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, color: settings.textColor,
        }}
        onMouseEnter={() => {
          setHovered(true);
          if (sideSubmenu && isExpandable) { cancelClose(); setShowSub(true); }
        }}
        onMouseLeave={() => {
          setHovered(false);
          if (sideSubmenu && isExpandable) scheduleClose(settings.submenuDelay ?? 300);
        }}
        onClick={handleClick}
      >
        {!sideSubmenu && isExpandable && (
          <span style={{ color: settings.textColor, opacity: 0.5 }}>
            {expanded ? <ChevronDown size={settings.fontSize} /> : <ChevronRight size={settings.fontSize} />}
          </span>
        )}
        <IconRenderer
          name={isExpandable && getIconType(item.iconName) === "lucide"
            ? (expanded && !sideSubmenu ? "FolderOpen" : isMenu ? "Layers" : "Folder")
            : isUrl && getIconType(item.iconName) === "lucide" ? (item.iconName || "Globe") : item.iconName}
          color={item.iconColor} size={iconSize}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {(isUrl || (!isExpandable && hasPath)) && hovered && (
          <ExternalLink size={settings.fontSize - 2} style={{ color: settings.textColor, opacity: 0.4 }} />
        )}
        {sideSubmenu && isExpandable && item.children.length > 0 && (
          <ChevronRight size={settings.fontSize} style={{ color: settings.textColor, opacity: 0.5 }} />
        )}
        {!sideSubmenu && isExpandable && !expanded && item.children.length > 0 && (
          <span className="text-[10px] opacity-40 tabular-nums" style={{ fontFamily: settings.fontFamily }}>{item.children.length}</span>
        )}
      </div>

      {/* Vertical expand */}
      {isExpandable && !sideSubmenu && expanded && item.children.length > 0 && (
        <div>
          {item.children.map((c) => (
            <PopupItem key={c.id} item={c} settings={settings} depth={depth + 1} sideSubmenu={false} onLaunch={onLaunch} />
          ))}
        </div>
      )}

      {/* Side submenu */}
      {isExpandable && sideSubmenu && showSub && item.children.length > 0 && (
        <div
          style={{
            position: "absolute", left: "100%", top: 0,
            width: `${settings.menuWidth}px`,
            ...getMenuStyleCSS(settings), ...getBorderCSS(settings), zIndex: 9999,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={() => scheduleClose(settings.submenuDelay ?? 300)}
        >
          <div className="py-1.5">
            {item.children.map((c) => (
              <PopupItem key={c.id} item={c} settings={settings} depth={0} sideSubmenu={true} onLaunch={onLaunch} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Bottom action buttons (Open Editor, Quit)
// ────────────────────────────────────────────────────────────────

function BottomAction({
  label, icon, settings, onClick,
}: {
  label: string;
  icon: string;
  settings: Omit<MenuSettings, "id">;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-2 cursor-pointer transition-colors"
      style={{
        padding: `${settings.itemSpacing + 3}px 10px`,
        paddingLeft: "10px",
        backgroundColor: hovered ? settings.hoverColor : "transparent",
        borderRadius: `${Math.max(settings.borderRadius - 4, 2)}px`,
        margin: "0 4px",
        fontFamily: settings.fontFamily,
        fontSize: `${(settings.fontSize ?? 13) - 1}px`,
        color: settings.textColor,
        opacity: hovered ? 1 : 0.6,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <IconRenderer name={icon} color={settings.textColor} size={(settings.iconSize ?? 16) - 2} />
      <span>{label}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main popup page
// ────────────────────────────────────────────────────────────────

export default function TrayPopup() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Omit<MenuSettings, "id">>({
    fontFamily: "Inter", fontSize: 13, iconSize: 16, itemSpacing: 2,
    accentColor: "#3b82f6", backgroundColor: "#1e1e2e", textColor: "#cdd6f4",
    menuWidth: 280, borderRadius: 8, separatorColor: "#45475a", hoverColor: "#313244",
    submenuDirection: "vertical", menuStyle: "none", borderStyle: "flat",
    borderThickness: "thin", borderColor: "#45475a",
    gradientColorMid: "#2a2a3e", gradientColorEnd: "#3a3a5e",
    launchAtStartup: false, submenuDelay: 300,
  });

  const sideSubmenu = (settings.submenuDirection ?? "vertical") === "side";
  const tree = buildTree(items) as TreeItem[];

  // Transparent background
  useEffect(() => {
    document.documentElement.style.cssText = "background:transparent!important";
    document.body.style.cssText = "background:transparent!important;margin:0;padding:0;overflow:hidden";
    const root = document.getElementById("root");
    if (root) root.style.cssText = "background:transparent!important";
  }, []);

  const hidePopup = useCallback(async () => {
    try { await getCurrentWindow().hide(); } catch {}
  }, []);

  // Listen for menu data
  useEffect(() => {
    const unlisten = listen<{ items: MenuItem[]; settings: any }>("tray-popup-data", (ev) => {
      setItems(ev.payload.items);
      if (ev.payload.settings) setSettings(ev.payload.settings);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ── DISMISS: poll isFocused every 300ms ──
  // onFocusChanged is unreliable on transparent windows in Windows,
  // so we poll instead. When the window loses focus, hide it.
  useEffect(() => {
    const win = getCurrentWindow();
    let active = true;

    const poll = async () => {
      while (active) {
        try {
          const visible = await win.isVisible();
          if (visible) {
            const focused = await win.isFocused();
            if (!focused) {
              await win.hide();
            }
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 300));
      }
    };
    poll();

    return () => { active = false; };
  }, []);

  // Escape to dismiss
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") hidePopup(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [hidePopup]);

  return (
    <>
      <style>{`
        html, body, #root { background: transparent !important; }
        *::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        id="popup-backdrop"
        onMouseDown={(e) => { if ((e.target as HTMLElement).id === "popup-backdrop") hidePopup(); }}
        style={{
          width: "100vw", height: "100vh",
          display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start",
          overflow: "visible",
        }}
      >
        <div style={{
          width: `${settings.menuWidth}px`, maxHeight: "85vh",
          overflowY: sideSubmenu ? "visible" : "auto", overflowX: "visible",
          position: "relative",
          ...getMenuStyleCSS(settings), ...getBorderCSS(settings),
        }}>
          <div className="py-1.5">
            {tree.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-center"
                style={{ color: settings.textColor, opacity: 0.4, fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px` }}>
                No items configured
              </div>
            ) : tree.map((item) => (
              <PopupItem key={item.id} item={item} settings={settings} sideSubmenu={sideSubmenu} onLaunch={hidePopup} />
            ))}

            {/* Separator */}
            <div className="px-3" style={{ paddingTop: `${settings.itemSpacing + 4}px`, paddingBottom: `${settings.itemSpacing + 4}px` }}>
              <div className="h-px w-full" style={{ backgroundColor: settings.separatorColor }} />
            </div>

            {/* Open Editor */}
            <BottomAction
              label="Open Editor"
              icon="Settings"
              settings={settings}
              onClick={async () => {
                try {
                  const main = new Window("main");
                  await main.show();
                  await main.unminimize();
                  await main.setFocus();
                } catch {}
                hidePopup();
              }}
            />

            {/* Quit */}
            <BottomAction
              label="Quit Menu Maestro"
              icon="Power"
              settings={settings}
              onClick={async () => {
                try { await invoke("quit_app"); } catch {}
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
