import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconRenderer, getIconType } from "@/components/icon-renderer";
import { ChevronRight, ChevronDown, ExternalLink, GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import type { MenuItem, MenuSettings, MenuProfile } from "@shared/schema";
import { buildTree, canHaveChildren } from "@/lib/menu-store";
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

// ────────────────────────────────────────────────────────────────
// Sortable preview item — the menu item itself, draggable + editable
// ────────────────────────────────────────────────────────────────

function SortablePreviewItem({
  item, settings, depth = 0, expandedFolders, toggleFolder,
  hoveredId, setHoveredId, sideSubmenu, isDropTarget, isDragging: parentDragging,
  onEdit, onDelete,
}: {
  item: TreeItem;
  settings: Omit<MenuSettings, "id">;
  depth?: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  sideSubmenu: boolean;
  isDropTarget: boolean;
  isDragging?: boolean;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const itemRef = useRef<HTMLDivElement>(null);
  const [subPos, setSubPos] = useState({ top: 0, left: 0 });
  const [showSub, setShowSub] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFolder = item.type === "folder";
  const isMenu = item.type === "menu";
  const isSeparator = item.type === "separator";
  const folderAction = (item as any).folderAction || "expand";
  const isExpandableFolder = isMenu || (isFolder && folderAction === "expand");
  const isExpanded = expandedFolders.has(item.id);
  const isHovered = hoveredId === item.id;
  const hasShortcutPath = !!(item as any).shortcutPath;
  const isUrl = item.type === "url";
  const iconSize = settings.iconSize ?? 16;

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = (ms = 250) => {
    cancelClose();
    closeTimer.current = setTimeout(() => setShowSub(false), ms);
  };
  useEffect(() => () => cancelClose(), []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Calculate side submenu position and show on hover
  useEffect(() => {
    if (isHovered && sideSubmenu && isExpandableFolder && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setSubPos({ top: rect.top, left: rect.right });
      cancelClose();
      setShowSub(true);
    }
  }, [isHovered, sideSubmenu, isExpandableFolder]);

  if (isSeparator) {
    return (
      <div ref={setNodeRef} style={style} className="group relative">
        <div
          className="px-3"
          style={{
            paddingTop: `${settings.itemSpacing + 2}px`,
            paddingBottom: `${settings.itemSpacing + 2}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <button className="cursor-grab touch-none opacity-0 group-hover:opacity-40 transition-opacity" {...attributes} {...listeners}>
              <GripVertical size={10} style={{ color: settings.textColor }} />
            </button>
            <div className="h-px flex-1" style={{ backgroundColor: settings.separatorColor }} />
            {onEdit && onDelete && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
                <button onClick={() => onEdit(item)} className="p-0.5 rounded hover:opacity-100" style={{ color: settings.textColor }}>
                  <Pencil size={10} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-0.5 rounded hover:opacity-100" style={{ color: settings.textColor }}>
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    if (isExpandableFolder) {
      toggleFolder(item.id);
      return;
    }
    if (isUrl && hasShortcutPath) {
      launchMenuItem({ type: "url", label: item.label ?? undefined, shortcutPath: (item as any).shortcutPath });
      return;
    }
    if (hasShortcutPath) {
      launchMenuItem({ type: item.type, label: item.label ?? undefined, shortcutPath: (item as any).shortcutPath });
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        ref={itemRef}
        className={cn(
          "group flex items-center gap-2 cursor-pointer transition-colors",
          isDropTarget && "ring-1 ring-inset"
        )}
        style={{
          padding: `${settings.itemSpacing + 4}px 10px`,
          paddingLeft: sideSubmenu ? "10px" : `${depth * 16 + 10}px`,
          backgroundColor: isDropTarget
            ? `${settings.hoverColor}cc`
            : isHovered ? settings.hoverColor : "transparent",
          borderRadius: `${Math.max(settings.borderRadius - 4, 2)}px`,
          margin: "0 4px",
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
          color: settings.textColor,
          ...(isDropTarget ? { ringColor: settings.accentColor } : {}),
        }}
        onMouseEnter={() => {
          setHoveredId(item.id);
          if (sideSubmenu && isExpandableFolder) cancelClose();
        }}
        onMouseLeave={() => {
          if (sideSubmenu && isExpandableFolder) {
            scheduleClose();
          } else {
            setHoveredId(null);
          }
        }}
        onClick={handleClick}
      >
        {/* Drag handle — visible on hover */}
        <button
          className="cursor-grab touch-none opacity-0 group-hover:opacity-40 transition-opacity shrink-0"
          style={{ color: settings.textColor }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>

        {!sideSubmenu && isExpandableFolder && (
          <span style={{ color: settings.textColor, opacity: 0.5 }}>
            {isExpanded ? <ChevronDown size={settings.fontSize} /> : <ChevronRight size={settings.fontSize} />}
          </span>
        )}
        <IconRenderer
          name={
            isExpandableFolder && getIconType(item.iconName) === "lucide"
              ? (isExpanded && !sideSubmenu ? "FolderOpen" : isMenu ? "Layers" : "Folder")
              : isUrl && getIconType(item.iconName) === "lucide"
              ? (item.iconName || "Globe")
              : item.iconName
          }
          color={item.iconColor}
          size={iconSize}
        />
        <span className="flex-1 truncate">{item.label}</span>

        {!settings.hideShortcutArrows && (isUrl || (!isExpandableFolder && hasShortcutPath)) && (
          <ExternalLink
            size={settings.fontSize - 2}
            style={{ color: settings.textColor, opacity: isHovered ? 0.4 : 0 }}
          />
        )}

        {sideSubmenu && isExpandableFolder && item.children.length > 0 && (
          <ChevronRight size={settings.fontSize} style={{ color: settings.textColor, opacity: 0.5 }} />
        )}

        {!sideSubmenu && isExpandableFolder && !isExpanded && item.children.length > 0 && (
          <span className="text-[10px] opacity-40 tabular-nums" style={{ fontFamily: settings.fontFamily }}>
            {item.children.length}
          </span>
        )}

        {/* Edit/delete — visible on hover */}
        {onEdit && onDelete && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="p-0.5 rounded hover:opacity-100"
              style={{ color: settings.textColor }}
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-0.5 rounded hover:opacity-100"
              style={{ color: settings.textColor }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Vertical expand children */}
      {isExpandableFolder && item.children.length > 0 && !sideSubmenu && isExpanded && (
        <div>
          {item.children.map((child) => (
            <SortablePreviewItem
              key={child.id}
              item={child}
              settings={settings}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              sideSubmenu={false}
              isDropTarget={false}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Side submenu via portal */}
      {isExpandableFolder && item.children.length > 0 && sideSubmenu && showSub &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: `${subPos.left}px`,
              top: `${subPos.top}px`,
              width: `${settings.menuWidth}px`,
              maxHeight: `${(settings.menuHeight ?? 600) * 0.8}px`,
              overflowY: "auto",
              ...getMenuStyleCSS(settings),
              ...getBorderCSS(settings),
              zIndex: 9999,
            }}
            onMouseEnter={() => { setHoveredId(item.id); cancelClose(); }}
            onMouseLeave={() => { setHoveredId(null); scheduleClose(); }}
          >
            <div className="py-2">
              {item.children.map((child) => (
                <SortablePreviewItem
                  key={child.id}
                  item={child}
                  settings={settings}
                  depth={0}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  hoveredId={hoveredId}
                  setHoveredId={setHoveredId}
                  sideSubmenu={true}
                  isDropTarget={false}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Flatten tree for DnD — only visible (expanded) items
// ────────────────────────────────────────────────────────────────

function flattenForDnd(
  nodes: TreeItem[],
  expandedFolders: Set<string>,
  sideSubmenu: boolean,
  depth = 0,
): { item: TreeItem; depth: number }[] {
  const result: { item: TreeItem; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ item: node, depth });
    const isExpandable = canHaveChildren(node.type) &&
      (node.type === "menu" || ((node as any).folderAction || "expand") === "expand");
    if (isExpandable && !sideSubmenu && expandedFolders.has(node.id) && node.children.length > 0) {
      result.push(...flattenForDnd(node.children, expandedFolders, sideSubmenu, depth + 1));
    }
  }
  return result;
}

// ────────────────────────────────────────────────────────────────
// Main preview component — now with integrated DnD editing
// ────────────────────────────────────────────────────────────────

interface MenuPreviewProps {
  items: MenuItem[];
  settings: Omit<MenuSettings, "id">;
  profiles?: MenuProfile[];
  activeProfileId?: string | null;
  onProfileClick?: (profileId: string | null) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onReparent?: (itemId: string, newParentId: string | null) => void;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onAddClick?: () => void;
}

export function MenuPreview({
  items, settings, profiles, activeProfileId, onProfileClick,
  onReorder, onReparent, onEdit, onDelete, onToggleExpand, onAddClick,
}: MenuPreviewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const sideSubmenu = (settings.submenuDirection ?? "vertical") === "side";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleFolder = (id: string) => {
    if (onToggleExpand) onToggleExpand(id);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tree = buildTree(items) as TreeItem[];
  const flatItems = flattenForDnd(tree, expandedFolders, sideSubmenu);
  const allIds = flatItems.map((f) => f.item.id);
  const running = isElectron();
  const hasProfiles = profiles && profiles.length > 0;
  const editable = !!(onEdit && onDelete && onReorder);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) { setDropTargetId(null); return; }
    const overItem = items.find((i) => i.id === over.id);
    if (overItem && canHaveChildren(overItem.type)) {
      const fa = (overItem as any).folderAction || "expand";
      if (fa === "expand" || overItem.type === "menu") {
        setDropTargetId(over.id as string);
        return;
      }
    }
    setDropTargetId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDropTargetId(null);
    if (!over || active.id === over.id) return;

    const overItem = items.find((i) => i.id === over.id);
    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return;

    if (overItem && canHaveChildren(overItem.type)) {
      const fa = (overItem as any).folderAction || "expand";
      if ((fa === "expand" || overItem.type === "menu") && activeItem.parentId !== overItem.id) {
        onReparent?.(active.id as string, over.id as string);
        return;
      }
    }
    onReorder?.(active.id as string, over.id as string);
  };

  const menuContent = (
    <div className="py-2">
      {tree.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 text-center gap-2"
          style={{
            color: settings.textColor,
            opacity: 0.4,
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
          }}
        >
          <span>Empty menu</span>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: settings.hoverColor,
                color: settings.textColor,
                fontSize: `${settings.fontSize - 1}px`,
                opacity: 0.7,
              }}
            >
              <Plus size={14} />
              Add Item
            </button>
          )}
        </div>
      ) : (
        <>
          {tree.map((item) => (
            <SortablePreviewItem
              key={item.id}
              item={item}
              settings={settings}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              sideSubmenu={sideSubmenu}
              isDropTarget={dropTargetId === item.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {onAddClick && (
            <div className="px-2 pt-1">
              <button
                onClick={onAddClick}
                className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 transition-colors"
                style={{
                  color: settings.textColor,
                  opacity: 0.3,
                  fontFamily: settings.fontFamily,
                  fontSize: `${(settings.fontSize ?? 13) - 1}px`,
                  borderRadius: `${Math.max(settings.borderRadius - 4, 2)}px`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6", e.currentTarget.style.backgroundColor = settings.hoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3", e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Plus size={13} />
                Add Item
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

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
          overflowX: "visible",
          scrollbarGutter: "stable",
        }}
        data-testid="menu-preview-container"
      >
        {editable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              {menuContent}
            </SortableContext>
          </DndContext>
        ) : (
          menuContent
        )}

        {hasProfiles && (
          <>
            <div className="mx-3" style={{ height: "1px", backgroundColor: settings.separatorColor }} />
            <div className="flex flex-wrap gap-1 px-3 py-2" data-testid="profile-buttons-container">
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
                      <IconRenderer name={profile.iconName} color={profile.iconColor} size={(settings.iconSize ?? 16) - 2} />
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
        <span className="text-[10px] text-muted-foreground/40 font-mono" data-testid="text-preview-dimensions">
          {settings.menuWidth}px &middot; {settings.fontFamily} &middot; {settings.fontSize}px
        </span>
      </div>
    </div>
  );
}
