import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconRenderer, IconPicker } from "@/components/icon-renderer";
import type { MenuProfile, InsertProfile } from "@shared/schema";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: MenuProfile | null;
  onSave: (data: InsertProfile) => void;
}

export function ProfileDialog({ open, onOpenChange, profile, onSave }: ProfileDialogProps) {
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [showIcon, setShowIcon] = useState(true);
  const [showText, setShowText] = useState(true);
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? "");
      setIconName(profile?.iconName ?? "Layers");
      setIconColor(profile?.iconColor ?? null);
      setShowIcon(profile?.showIcon ?? true);
      setShowText(profile?.showText ?? true);
      setShowIconPicker(false);
    }
  }, [open, profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      iconName,
      iconColor,
      showIcon,
      showText,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-profile-dialog-title">
            {profile ? "Edit Profile" : "New Profile"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Profile Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Tools, Gaming, Media"
              autoFocus
              data-testid="input-profile-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Icon</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="flex items-center justify-center w-10 h-10 rounded-md border border-border hover-elevate"
                data-testid="button-profile-icon-picker"
              >
                <IconRenderer name={iconName} color={iconColor} size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <input
                  type="color"
                  value={iconColor || "#3b82f6"}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="w-7 h-7 rounded-md border border-border cursor-pointer"
                  data-testid="input-profile-icon-color"
                />
              </div>
            </div>
            {showIconPicker && (
              <div className="mt-2 border border-border rounded-md p-3 bg-background">
                <IconPicker
                  value={iconName}
                  onChange={(v) => {
                    setIconName(v);
                    setShowIconPicker(false);
                  }}
                  color={iconColor}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={showIcon}
                onCheckedChange={setShowIcon}
                data-testid="switch-profile-show-icon"
              />
              <Label className="text-xs">Show Icon</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showText}
                onCheckedChange={setShowText}
                data-testid="switch-profile-show-text"
              />
              <Label className="text-xs">Show Text</Label>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</Label>
            <div className="flex items-center gap-2">
              {showIcon && <IconRenderer name={iconName} color={iconColor} size={14} />}
              {showText && <span className="text-sm">{name || "Profile"}</span>}
              {!showIcon && !showText && (
                <span className="text-xs text-muted-foreground">Nothing visible</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-profile"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || (!showIcon && !showText)}
              data-testid="button-save-profile"
            >
              {profile ? "Save Changes" : "Create Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
