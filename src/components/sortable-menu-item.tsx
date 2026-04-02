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
  isDropTarget?: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleExpand?: (id: string) => void;
}

export function SortableMenuItem({
  item, depth = 0, isDropTarget = false, onEdit, onDelete, onToggleExpand,
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
          "flex items-center gap-1 rounded-sm px-1.5 transition-colors h-7",
          isDropTarget ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        data-testid={`menu-item-${item.id}`}
      >
        <button
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical size={12} />
        </button>

        {isExpandable && (
          <button
            onClick={() => onToggleExpand?.(item.id)}
            className="text-muted-foreground hover:text-foreground"
            data-testid={`toggle-folder-${item.id}`}
          >
            {item.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}

        {isSeparator ? (
          <div className="flex-1 flex items-center gap-2">
            <Minus size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground italic">Separator</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <IconRenderer name={item.iconName} color={item.iconColor} size={12} />
            <span className="text-xs truncate">{item.label}</span>
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider ml-auto shrink-0">
              {isFolder && !isExpandable ? "link" : item.type === "url" ? "url" : item.type}
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
            <Pencil size={12} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            data-testid={`button-delete-${item.id}`}
          >
            <Trash2 size={12} className="text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
