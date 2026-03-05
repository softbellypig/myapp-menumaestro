import { useState, useRef, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Download } from "lucide-react";
import { SortableMenuItem } from "@/components/sortable-menu-item";
import { isTauri, checkPath, getFileIcon, onNativeFileDrop } from "@/lib/tauri-api";
import { canHaveChildren } from "@/lib/menu-store";
import type { MenuItem } from "@shared/schema";
import { buildTree } from "@/lib/menu-store";
import type { AddItemInitialValues } from "@/components/add-item-dialog";

interface MenuEditorProps {
  items: MenuItem[];
  onReorder: (activeId: string, overId: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddClick: () => void;
  onFileDrop?: (values: AddItemInitialValues) => void;
}

function inferItemType(filePath: string, isDirectory: boolean): "program" | "file" | "folder" {
  if (isDirectory) return "folder";
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  if (["exe", "bat", "cmd", "lnk", "ps1", "msi"].includes(ext)) return "program";
  return "file";
}

function labelFromPath(filePath: string, type: "program" | "file" | "folder"): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const filename = parts[parts.length - 1] || "";
  if (type === "program") {
    return filename.replace(/\.(exe|bat|cmd|lnk|ps1|msi)$/i, "");
  }
  return filename;
}

async function processDroppedFile(
  filePath: string,
  dropFn: (values: AddItemInitialValues) => void
) {
  if (!filePath) return;

  let isDirectory = false;
  try {
    const result = await checkPath(filePath);
    isDirectory = result.isDirectory || false;
  } catch { /* ignore */ }

  const type = inferItemType(filePath, isDirectory);
  const label = labelFromPath(filePath, type);

  let iconName: string | undefined;
  try {
    const extracted = await getFileIcon(filePath);
    if (extracted) iconName = extracted;
  } catch { /* ignore */ }

  if (!iconName) {
    if (type === "folder") iconName = "Folder";
    else if (type === "program") iconName = "Terminal";
    else iconName = "FileText";
  }

  dropFn({
    type,
    label,
    shortcutPath: filePath,
    iconName,
    iconColor: type === "program" ? "#3b82f6" : type === "folder" ? "#facc15" : "#a78bfa",
    folderAction: type === "folder" ? "open" : undefined,
  });
}

export function MenuEditor({
  items, onReorder, onEdit, onDelete, onToggleExpand, onAddClick, onFileDrop,
}: MenuEditorProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const onFileDropRef = useRef(onFileDrop);
  onFileDropRef.current = onFileDrop;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  // Listen for native file drop events from Tauri backend
  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = onNativeFileDrop(async (filePaths: string[]) => {
      const dropFn = onFileDropRef.current;
      if (!dropFn || filePaths.length === 0) return;
      setIsDragOver(false);
      await processDroppedFile(filePaths[0], dropFn);
    });

    // Cleanup listener on unmount
    return () => {
      // onNativeFileDrop returns void (listener stays), but that's fine for app lifecycle
    };
  }, []);

  // Visual drag overlay for Tauri's native drag-drop
  // Tauri handles the actual drop natively — we just show/hide the overlay
  useEffect(() => {
    if (!isTauri()) return;

    // Listen for Tauri drag enter/leave events via the window
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      // Only hide if leaving the window entirely
      if (e.relatedTarget === null) {
        setIsDragOver(false);
      }
    };
    const handleDrop = () => {
      setIsDragOver(false);
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  const tree = buildTree(items);

  const flattenForDnd = (
    nodes: (MenuItem & { children: MenuItem[] })[],
    depth = 0
  ): { item: MenuItem & { children: MenuItem[] }; depth: number }[] => {
    const result: { item: MenuItem & { children: MenuItem[] }; depth: number }[] = [];
    for (const node of nodes) {
      result.push({ item: node, depth });
      const isExpandable = canHaveChildren(node.type) && (node.type === "menu" || ((node as any).folderAction || "expand") === "expand");
      if (isExpandable && node.isExpanded && node.children.length > 0) {
        result.push(
          ...flattenForDnd(
            node.children.map((c) => ({ ...c, children: [] })),
            depth + 1
          )
        );
      }
    }
    return result;
  };

  const flatItems = flattenForDnd(tree);
  const allIds = flatItems.map((f) => f.item.id);

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-medium">Menu Items</h2>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <Button size="sm" onClick={onAddClick} data-testid="button-add-item">
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1 relative">
        {isDragOver && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center text-center p-8 rounded-xl border-2 border-dashed border-primary/30 bg-background/95">
              <div className="rounded-full bg-primary/10 p-4 mb-3">
                <Download size={32} className="text-primary" />
              </div>
              <p className="text-base font-medium text-primary">Drop to add</p>
              <p className="text-xs text-muted-foreground mt-1">
                Programs, files, folders, and shortcuts
              </p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Layers size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No items yet</p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              Drag files here or click Add to build your tray menu.
            </p>
            <Button size="sm" onClick={onAddClick} data-testid="button-add-first-item">
              <Plus size={14} className="mr-1" />
              Add First Item
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col">
                {flatItems.map(({ item, depth }) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    depth={depth}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleExpand={onToggleExpand}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
