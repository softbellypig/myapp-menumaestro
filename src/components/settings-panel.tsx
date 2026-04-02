import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FONT_OPTIONS } from "@/lib/menu-store";
import { invoke } from "@tauri-apps/api/core";
import type { MenuSettings } from "@shared/schema";
import { Type, Maximize2, Palette, Image, Layers, Frame, Cog } from "lucide-react";

interface SettingsPanelProps {
  settings: Omit<MenuSettings, "id">;
  onChange: (updates: Partial<Omit<MenuSettings, "id">>) => void;
}

function ColorSwatch({ label, value, onChange, testId }: {
  label: string; value: string; onChange: (v: string) => void; testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground whitespace-nowrap">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded-md border border-input cursor-pointer"
          data-testid={testId}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 text-xs font-mono"
          data-testid={`${testId}-hex`}
        />
      </div>
    </div>
  );
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Type size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Typography</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Font Family</Label>
          <Select value={settings.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
            <SelectTrigger data-testid="select-font-family" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span style={{ fontFamily: f.value }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Font Size</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.fontSize}px</span>
          </div>
          <Slider
            value={[settings.fontSize]}
            onValueChange={([v]) => onChange({ fontSize: v })}
            min={10}
            max={20}
            step={1}
            data-testid="slider-font-size"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Image size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Icons</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Icon Size</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.iconSize ?? 16}px</span>
          </div>
          <Slider
            value={[settings.iconSize ?? 16]}
            onValueChange={([v]) => onChange({ iconSize: v })}
            min={10}
            max={32}
            step={1}
            data-testid="slider-icon-size"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Maximize2 size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Layout</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Item Spacing</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.itemSpacing}px</span>
          </div>
          <Slider
            value={[settings.itemSpacing]}
            onValueChange={([v]) => onChange({ itemSpacing: v })}
            min={0}
            max={8}
            step={1}
            data-testid="slider-item-spacing"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Menu Width</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.menuWidth}px</span>
          </div>
          <Slider
            value={[settings.menuWidth]}
            onValueChange={([v]) => onChange({ menuWidth: v })}
            min={200}
            max={400}
            step={10}
            data-testid="slider-menu-width"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Menu Height</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.menuHeight ?? 600}px</span>
          </div>
          <Slider
            value={[settings.menuHeight ?? 600]}
            onValueChange={([v]) => onChange({ menuHeight: v })}
            min={200}
            max={900}
            step={10}
            data-testid="slider-menu-height"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Border Radius</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.borderRadius}px</span>
          </div>
          <Slider
            value={[settings.borderRadius]}
            onValueChange={([v]) => onChange({ borderRadius: v })}
            min={0}
            max={20}
            step={1}
            data-testid="slider-border-radius"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Submenu Direction</Label>
          <Select
            value={settings.submenuDirection ?? "vertical"}
            onValueChange={(v) => onChange({ submenuDirection: v as "vertical" | "side" })}
          >
            <SelectTrigger data-testid="select-submenu-direction" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical (expand inline)</SelectItem>
              <SelectItem value="side">Side (cascade right)</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {(settings.submenuDirection ?? "vertical") === "vertical"
              ? "Submenus expand below their parent."
              : "Submenus open to the right, like classic Windows menus."}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">Hide Shortcut Arrows</Label>
          <Switch
            checked={settings.hideShortcutArrows ?? false}
            onCheckedChange={(v) => onChange({ hideShortcutArrows: v })}
            data-testid="switch-hide-shortcut-arrows"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Layers size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Menu Style</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Background Style</Label>
          <Select
            value={settings.menuStyle ?? "none"}
            onValueChange={(v) => onChange({ menuStyle: v as MenuSettings["menuStyle"] })}
          >
            <SelectTrigger data-testid="select-menu-style" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (solid color)</SelectItem>
              <SelectItem value="brushed-metal">Brushed Metal</SelectItem>
              <SelectItem value="soft-grid">Soft Grid</SelectItem>
              <SelectItem value="frosted-glass">Frosted Glass</SelectItem>
              <SelectItem value="gradient">Gradient (three-tone)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(settings.menuStyle ?? "none") === "gradient" && (
          <>
            <ColorSwatch
              label="Mid Color"
              value={settings.gradientColorMid ?? "#2a2a3e"}
              onChange={(v) => onChange({ gradientColorMid: v })}
              testId="color-gradient-mid"
            />
            <ColorSwatch
              label="End Color"
              value={settings.gradientColorEnd ?? "#3a3a5e"}
              onChange={(v) => onChange({ gradientColorEnd: v })}
              testId="color-gradient-end"
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Frame size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Border Style</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Style</Label>
          <Select
            value={settings.borderStyle ?? "flat"}
            onValueChange={(v) => onChange({ borderStyle: v as MenuSettings["borderStyle"] })}
          >
            <SelectTrigger data-testid="select-border-style" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="soft-shadow">Soft Shadow</SelectItem>
              <SelectItem value="neumorphic">Neumorphic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Thickness</Label>
          <Select
            value={settings.borderThickness ?? "thin"}
            onValueChange={(v) => onChange({ borderThickness: v as MenuSettings["borderThickness"] })}
          >
            <SelectTrigger data-testid="select-border-thickness" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="thin">Thin</SelectItem>
              <SelectItem value="thick">Thick</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(settings.borderThickness ?? "thin") !== "none" && (
          <ColorSwatch
            label="Border Color"
            value={settings.borderColor ?? "#45475a"}
            onChange={(v) => onChange({ borderColor: v })}
            testId="color-border"
          />
        )}
      </div>

      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Palette size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Colors</span>
      </div>

      <div className="flex flex-col gap-2">
        <ColorSwatch
          label="Background"
          value={settings.backgroundColor}
          onChange={(v) => onChange({ backgroundColor: v })}
          testId="color-background"
        />
        <ColorSwatch
          label="Text"
          value={settings.textColor}
          onChange={(v) => onChange({ textColor: v })}
          testId="color-text"
        />
        <ColorSwatch
          label="Accent"
          value={settings.accentColor}
          onChange={(v) => onChange({ accentColor: v })}
          testId="color-accent"
        />
        <ColorSwatch
          label="Hover"
          value={settings.hoverColor}
          onChange={(v) => onChange({ hoverColor: v })}
          testId="color-hover"
        />
        <ColorSwatch
          label="Separator"
          value={settings.separatorColor}
          onChange={(v) => onChange({ separatorColor: v })}
          testId="color-separator"
        />
      </div>

    {/* ── Behavior ─────────────────────────── */}
    <div className="flex items-center gap-2 pb-1 border-b border-border mt-2">
      <Cog size={14} className="text-muted-foreground" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Behavior</span>
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Launch at Startup</Label>
        <Switch
          checked={settings.launchAtStartup ?? false}
          onCheckedChange={async (checked) => {
            onChange({ launchAtStartup: checked });
            try { await invoke("set_launch_at_startup", { enabled: checked }); } catch {}
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Submenu Delay</Label>
          <span className="text-xs font-mono text-muted-foreground">{settings.submenuDelay ?? 300}ms</span>
        </div>
        <Slider
          value={[settings.submenuDelay ?? 300]}
          onValueChange={([v]) => onChange({ submenuDelay: v })}
          min={50}
          max={800}
          step={50}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Popup Offset X</Label>
          <span className="text-xs font-mono text-muted-foreground">{settings.popupOffsetX ?? 0}px</span>
        </div>
        <Slider
          value={[settings.popupOffsetX ?? 0]}
          onValueChange={([v]) => onChange({ popupOffsetX: v })}
          min={-500}
          max={500}
          step={10}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Popup Offset Y</Label>
          <span className="text-xs font-mono text-muted-foreground">{settings.popupOffsetY ?? 0}px</span>
        </div>
        <Slider
          value={[settings.popupOffsetY ?? 0]}
          onValueChange={([v]) => onChange({ popupOffsetY: v })}
          min={-500}
          max={500}
          step={10}
        />
      </div>
    </div>
    </div>
  );
}
