import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/icon-renderer";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, ChevronRight, ChevronDown, Minus } from "lucide-react";
import type { MenuItem } from "@shared/schema";

interface SortableMenuItemProps {
  item: MenuItem & { children?: MenuItem[] };
  depth?: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleExpand?: (id: string) => void;
}

export function SortableMenuItem({
  item, depth = 0, onEdit, onDelete, onToggleExpand,
}: SortableMenuItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSeparator = item.type === "separator";
  const isFolder = item.type === "folder";
  const isMenu = item.type === "menu";
  const isExpandable = isMenu || (isFolder && (item.folderAction || "expand") === "expand");

  return (
    <div ref={setNodeRef} style={style} className={cn("group", isDragging && "opacity-50")}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2 py-px transition-colors",
          "hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        data-testid={`menu-item-${item.id}`}
      >
        <button
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical size={14} />
        </button>

        {isExpandable && (
          <button
            onClick={() => onToggleExpand?.(item.id)}
            className="text-muted-foreground hover:text-foreground"
            data-testid={`toggle-folder-${item.id}`}
          >
            {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {isSeparator ? (
          <div className="flex-1 flex items-center gap-2">
            <Minus size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground italic">Separator</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconRenderer name={item.iconName} color={item.iconColor} size={15} />
            <span className="text-sm truncate">{item.label}</span>
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider ml-auto">
              {isFolder && !isExpandable ? "folder link" : item.type === "url" ? "url" : item.type}
            </span>
          </div>
        )}

        <div className="flex items-center gap-0.5 invisible group-hover:visible">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(item)}
            data-testid={`button-edit-${item.id}`}
          >
            <Pencil size={13} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            data-testid={`button-delete-${item.id}`}
          >
            <Trash2 size={13} className="text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
