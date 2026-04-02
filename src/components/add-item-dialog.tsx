import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IconPicker, IconRenderer, getIconType } from "@/components/icon-renderer";
import { isTauri as isElectron, pickPath, getFileIcon } from "@/lib/tauri-api";
import { FolderSearch } from "lucide-react";
import { canHaveChildren, buildTree } from "@/lib/menu-store";
import type { MenuItem } from "@shared/schema";

type TreeMenuItem = MenuItem & { children: TreeMenuItem[] };

/** Flatten tree into ordered list with depth, for hierarchical dropdown */
function flattenFolderTree(
  nodes: TreeMenuItem[],
  depth = 0,
  exclude?: string
): { item: MenuItem; depth: number }[] {
  const result: { item: MenuItem; depth: number }[] = [];
  for (const node of nodes) {
    if (node.id === exclude) continue;
    const isExpandable = canHaveChildren(node.type) &&
      (node.type === "menu" || ((node as any).folderAction || "expand") === "expand");
    if (isExpandable) {
      result.push({ item: node, depth });
      result.push(...flattenFolderTree(node.children as TreeMenuItem[], depth + 1, exclude));
    }
  }
  return result;
}

export interface AddItemInitialValues {
  type?: "program" | "file" | "folder" | "separator" | "url" | "menu";
  label?: string;
  shortcutPath?: string;
  iconName?: string;
  iconColor?: string;
  folderAction?: "expand" | "open";
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: {
    type: "program" | "file" | "folder" | "separator" | "url" | "menu";
    label?: string;
    shortcutPath?: string;
    iconName?: string;
    iconColor?: string;
    parentId?: string | null;
    folderAction?: "expand" | "open" | null;
  }) => void;
  folders: MenuItem[];
  allItems?: MenuItem[];
  initialValues?: AddItemInitialValues | null;
}

export function AddItemDialog({ open, onOpenChange, onAdd, folders, allItems, initialValues }: AddItemDialogProps) {
  const [type, setType] = useState<"program" | "file" | "folder" | "separator" | "url" | "menu">("program");
  const [label, setLabel] = useState("");
  const [shortcutPath, setShortcutPath] = useState("");
  const [iconName, setIconName] = useState("Terminal");
  const [iconColor, setIconColor] = useState("#3b82f6");
  const [parentId, setParentId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [folderAction, setFolderAction] = useState<"expand" | "open">("expand");

  // Apply initial values when dialog opens with them (from drag-and-drop)
  useEffect(() => {
    if (open && initialValues) {
      if (initialValues.type) setType(initialValues.type);
      if (initialValues.label) setLabel(initialValues.label);
      if (initialValues.shortcutPath) setShortcutPath(initialValues.shortcutPath);
      if (initialValues.iconName) setIconName(initialValues.iconName);
      if (initialValues.iconColor) setIconColor(initialValues.iconColor);
      if (initialValues.folderAction) setFolderAction(initialValues.folderAction);
    }
  }, [open, initialValues]);

  const handleSubmit = () => {
    if (type === "separator") {
      onAdd({ type, parentId });
      resetAndClose();
      return;
    }
    if (!label.trim()) return;
    onAdd({
      type,
      label: label.trim(),
      shortcutPath: shortcutPath.trim() || undefined,
      iconName,
      iconColor,
      parentId,
      folderAction: type === "folder" ? folderAction : null,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setType("program");
    setLabel("");
    setShortcutPath("");
    setIconName("Terminal");
    setIconColor("#3b82f6");
    setParentId(null);
    setShowIconPicker(false);
    setFolderAction("expand");
    onOpenChange(false);
  };

  const handleBrowse = async () => {
    const pickerType = type === "folder" ? "folder" : type === "file" ? "file" : "program";
    const selectedPath = await pickPath(pickerType);
    if (selectedPath) {
      setShortcutPath(selectedPath);
      if (!label.trim()) {
        const parts = selectedPath.replace(/\\/g, "/").split("/");
        const filename = parts[parts.length - 1] || "";
        const cleaned = type === "program"
          ? filename.replace(/\.(exe|bat|cmd|lnk|ps1)$/i, "")
          : filename;
        setLabel(cleaned);
      }
      const extractedIcon = await getFileIcon(selectedPath);
      if (extractedIcon) {
        setIconName(extractedIcon);
      }
    }
  };

  const isSeparator = type === "separator";
  const inElectron = isElectron();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
          <DialogDescription>Create a new shortcut, folder, or separator for your tray menu.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger data-testid="select-item-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="folder">Folder</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="separator">Separator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isSeparator && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={type === "folder" ? "My Folder" : "My Shortcut"}
                  data-testid="input-item-label"
                />
              </div>

              {type === "url" && (
                <div className="flex flex-col gap-2">
                  <Label>URL</Label>
                  <Input
                    value={shortcutPath}
                    onChange={(e) => setShortcutPath(e.target.value)}
                    placeholder="https://example.com"
                    data-testid="input-url-path"
                  />
                </div>
              )}

              {type !== "folder" && type !== "url" && (
                <div className="flex flex-col gap-2">
                  <Label>File Path</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shortcutPath}
                      onChange={(e) => setShortcutPath(e.target.value)}
                      placeholder="C:\Program Files\..."
                      className="flex-1"
                      data-testid="input-shortcut-path"
                    />
                    {inElectron && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleBrowse}
                        title="Browse for file"
                        data-testid="button-browse-path"
                      >
                        <FolderSearch size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {type === "folder" && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Click Action</Label>
                    <Select value={folderAction} onValueChange={(v) => setFolderAction(v as "expand" | "open")}>
                      <SelectTrigger data-testid="select-folder-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expand">Expand as submenu</SelectItem>
                        <SelectItem value="open">Open folder location</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {folderAction === "expand"
                        ? "Items inside this folder will appear as a submenu."
                        : "Clicking this folder will open it in your file explorer."}
                    </span>
                  </div>

                  {folderAction === "open" && (
                    <div className="flex flex-col gap-2">
                      <Label>Folder Path</Label>
                      <div className="flex gap-2">
                        <Input
                          value={shortcutPath}
                          onChange={(e) => setShortcutPath(e.target.value)}
                          placeholder="C:\Users\You\Documents"
                          className="flex-1"
                          data-testid="input-shortcut-path"
                        />
                        {inElectron && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleBrowse}
                            title="Browse for folder"
                            data-testid="button-browse-folder"
                          >
                            <FolderSearch size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label>Icon</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover-elevate"
                    data-testid="button-toggle-icon-picker"
                  >
                    <IconRenderer name={iconName} color={iconColor} size={16} />
                    <span className="text-muted-foreground">
                      {showIconPicker ? "Hide Picker" : "Change Icon"}
                    </span>
                  </button>
                  {getIconType(iconName) === "lucide" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <input
                        type="color"
                        value={iconColor}
                        onChange={(e) => setIconColor(e.target.value)}
                        className="h-8 w-8 rounded-md border border-input cursor-pointer"
                        data-testid="input-icon-color"
                      />
                    </div>
                  )}
                </div>
                {showIconPicker && (
                  <div className="rounded-md border border-input bg-background p-2">
                    <IconPicker value={iconName} onChange={setIconName} color={iconColor} />
                  </div>
                )}
              </div>
            </>
          )}

          {folders.length > 0 && (() => {
            const tree = buildTree(allItems || folders) as TreeMenuItem[];
            const orderedFolders = flattenFolderTree(tree);
            return (
              <div className="flex flex-col gap-2">
                <Label>Parent Folder</Label>
                <Select
                  value={parentId || "__root__"}
                  onValueChange={(v) => setParentId(v === "__root__" ? null : v)}
                >
                  <SelectTrigger data-testid="select-parent-folder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">Root (Top Level)</SelectItem>
                    {orderedFolders.map(({ item: f, depth }) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
                          <IconRenderer name={f.iconName} color={f.iconColor} size={14} />
                          <span className="truncate">{f.label || "Unnamed Folder"}</span>
                          {depth > 0 && (
                            <span className="text-[9px] text-muted-foreground/50 ml-1">sub</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} data-testid="button-cancel-add">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isSeparator && !label.trim()} data-testid="button-confirm-add">
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
