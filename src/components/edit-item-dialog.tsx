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
import { canHaveChildren, buildTree } from "@/lib/menu-store";
import { FolderSearch } from "lucide-react";
import type { MenuItem } from "@shared/schema";

type TreeMenuItem = MenuItem & { children: TreeMenuItem[] };

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

type ItemType = "program" | "file" | "folder" | "separator" | "url" | "menu";

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onSave: (id: string, updates: Partial<MenuItem>) => void;
  folders: MenuItem[];
  allItems?: MenuItem[];
}

export function EditItemDialog({ open, onOpenChange, item, onSave, folders, allItems }: EditItemDialogProps) {
  const [type, setType] = useState<ItemType>("program");
  const [label, setLabel] = useState("");
  const [shortcutPath, setShortcutPath] = useState("");
  const [iconName, setIconName] = useState("Terminal");
  const [iconColor, setIconColor] = useState("#3b82f6");
  const [parentId, setParentId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [folderAction, setFolderAction] = useState<"expand" | "open">("expand");

  useEffect(() => {
    if (item) {
      setType(item.type as ItemType);
      setLabel(item.label || "");
      setShortcutPath(item.shortcutPath || "");
      setIconName(item.iconName || "Terminal");
      setIconColor(item.iconColor || "#3b82f6");
      setParentId(item.parentId || null);
      setShowIconPicker(false);
      setFolderAction(item.folderAction || "expand");
    }
  }, [item]);

  if (!item) return null;

  const isSeparator = type === "separator";
  const isMenu = type === "menu";
  const isFolder = type === "folder";
  const inElectron = isElectron();

  const handleSubmit = () => {
    onSave(item.id, {
      type,
      label: isSeparator ? undefined : label.trim(),
      shortcutPath: isSeparator || isMenu ? undefined : shortcutPath.trim(),
      iconName: isSeparator ? undefined : iconName,
      iconColor: isSeparator ? undefined : iconColor,
      parentId,
      folderAction: isFolder ? folderAction : (isMenu ? "expand" : undefined),
    });
    onOpenChange(false);
  };

  const handleBrowse = async () => {
    const pickerType = isFolder ? "folder" : type === "file" ? "file" : "program";
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

  const handleTypeChange = (newType: ItemType) => {
    setType(newType);
    if (!iconName.startsWith("custom:") && !iconName.startsWith("emoji:")) {
      if (newType === "menu") {
        setIconName("Layers");
        setIconColor("#a78bfa");
      } else if (newType === "folder") {
        setIconName("Folder");
        setIconColor("#facc15");
      } else if (newType === "program") {
        setIconName("Terminal");
        setIconColor("#3b82f6");
      } else if (newType === "file") {
        setIconName("FileText");
        setIconColor("#a78bfa");
      } else if (newType === "url") {
        setIconName("Globe");
        setIconColor("#f97316");
      }
    }
  };

  const availableFolders = folders.filter((f) => f.id !== item.id && canHaveChildren(f.type));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Modify the properties of this menu item.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as ItemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="folder">Folder</SelectItem>
                <SelectItem value="menu">Menu</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="separator">Separator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isSeparator && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>

              {type === "url" && (
                <div className="flex flex-col gap-2">
                  <Label>URL</Label>
                  <Input value={shortcutPath} onChange={(e) => setShortcutPath(e.target.value)} placeholder="https://example.com" />
                </div>
              )}

              {(type === "program" || type === "file") && (
                <div className="flex flex-col gap-2">
                  <Label>File Path</Label>
                  <div className="flex gap-2">
                    <Input value={shortcutPath} onChange={(e) => setShortcutPath(e.target.value)} className="flex-1" />
                    {inElectron && (
                      <Button type="button" variant="outline" size="icon" onClick={handleBrowse} title="Browse">
                        <FolderSearch size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {isFolder && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Click Action</Label>
                    <Select value={folderAction} onValueChange={(v) => setFolderAction(v as "expand" | "open")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expand">Expand contents as submenu</SelectItem>
                        <SelectItem value="open">Open in file explorer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Folder Path</Label>
                    <div className="flex gap-2">
                      <Input value={shortcutPath} onChange={(e) => setShortcutPath(e.target.value)} className="flex-1" />
                      {inElectron && (
                        <Button type="button" variant="outline" size="icon" onClick={handleBrowse} title="Browse">
                          <FolderSearch size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label>Icon</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover-elevate"
                  >
                    <IconRenderer name={iconName} color={iconColor} size={16} />
                    <span className="text-muted-foreground">{showIconPicker ? "Hide Picker" : "Change Icon"}</span>
                  </button>
                  {getIconType(iconName) === "lucide" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <input type="color" value={iconColor} onChange={(e) => setIconColor(e.target.value)} className="h-8 w-8 rounded-md border border-input cursor-pointer" />
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

          {availableFolders.length > 0 && (() => {
            const tree = buildTree(allItems || folders) as TreeMenuItem[];
            const orderedFolders = flattenFolderTree(tree, 0, item?.id);
            return (
              <div className="flex flex-col gap-2">
                <Label>Parent</Label>
                <Select value={parentId || "__root__"} onValueChange={(v) => setParentId(v === "__root__" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">Root (Top Level)</SelectItem>
                    {orderedFolders.map(({ item: f, depth }) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
                          <IconRenderer name={f.iconName} color={f.iconColor} size={14} />
                          <span className="truncate">{f.label || (f.type === "menu" ? "Unnamed Menu" : "Unnamed Folder")}</span>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isSeparator && !label.trim()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
