import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ImagePlus } from "lucide-react";

interface IconRendererProps {
  name: string | null | undefined;
  color?: string | null;
  size?: number;
  className?: string;
}

const iconMap: Record<string, LucideIcons.LucideIcon> = {
  Terminal: LucideIcons.Terminal,
  Monitor: LucideIcons.Monitor,
  FileText: LucideIcons.FileText,
  Folder: LucideIcons.Folder,
  FolderOpen: LucideIcons.FolderOpen,
  Globe: LucideIcons.Globe,
  Mail: LucideIcons.Mail,
  Music: LucideIcons.Music,
  Image: LucideIcons.Image,
  Video: LucideIcons.Video,
  Camera: LucideIcons.Camera,
  Headphones: LucideIcons.Headphones,
  Gamepad2: LucideIcons.Gamepad2,
  Code: LucideIcons.Code,
  Database: LucideIcons.Database,
  Settings: LucideIcons.Settings,
  Wrench: LucideIcons.Wrench,
  Paintbrush: LucideIcons.Paintbrush,
  Palette: LucideIcons.Palette,
  Layers: LucideIcons.Layers,
  Layout: LucideIcons.Layout,
  Grid3x3: LucideIcons.Grid3x3,
  Calculator: LucideIcons.Calculator,
  Calendar: LucideIcons.Calendar,
  Clock: LucideIcons.Clock,
  MessageSquare: LucideIcons.MessageSquare,
  Phone: LucideIcons.Phone,
  Wifi: LucideIcons.Wifi,
  Bluetooth: LucideIcons.Bluetooth,
  Cpu: LucideIcons.Cpu,
  HardDrive: LucideIcons.HardDrive,
  Printer: LucideIcons.Printer,
  Download: LucideIcons.Download,
  Upload: LucideIcons.Upload,
  Share2: LucideIcons.Share2,
  BookOpen: LucideIcons.BookOpen,
  Bookmark: LucideIcons.Bookmark,
  Star: LucideIcons.Star,
  Heart: LucideIcons.Heart,
  Zap: LucideIcons.Zap,
  Shield: LucideIcons.Shield,
  Lock: LucideIcons.Lock,
  Key: LucideIcons.Key,
  Search: LucideIcons.Search,
  Eye: LucideIcons.Eye,
  Map: LucideIcons.Map,
  Navigation: LucideIcons.Navigation,
  Compass: LucideIcons.Compass,
  Cloud: LucideIcons.Cloud,
  Sun: LucideIcons.Sun,
  File: LucideIcons.File,
};

export function getIconType(name: string | null | undefined): "lucide" | "emoji" | "custom" {
  if (!name) return "lucide";
  if (name.startsWith("emoji:")) return "emoji";
  if (name.startsWith("custom:")) return "custom";
  return "lucide";
}

export function getIconValue(name: string | null | undefined): string {
  if (!name) return "";
  if (name.startsWith("emoji:")) return name.slice(6);
  if (name.startsWith("custom:")) return name.slice(7);
  return name;
}

export function IconRenderer({ name, color, size = 16, className }: IconRendererProps) {
  const iconType = getIconType(name);
  const value = getIconValue(name);

  if (iconType === "emoji") {
    return (
      <span
        className={cn("inline-flex items-center justify-center leading-none", className)}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        role="img"
      >
        {value}
      </span>
    );
  }

  if (iconType === "custom") {
    return (
      <img
        src={value}
        alt=""
        className={cn("object-contain", className)}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  const IconComponent = value ? iconMap[value] : null;
  if (!IconComponent) {
    return <LucideIcons.Circle size={size} className={cn("opacity-30", className)} />;
  }
  return (
    <IconComponent
      size={size}
      style={color ? { color } : undefined}
      className={cn(className)}
    />
  );
}

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😎", "🤓", "🧐", "😏", "😌", "😴"],
  },
  {
    label: "Hands",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤝", "🙏", "✌️", "🤟", "🤘", "👌", "🤌", "👈", "👉", "👆", "👇"],
  },
  {
    label: "Objects",
    emojis: ["💻", "🖥️", "🖨️", "📱", "📲", "📞", "📟", "📠", "🔌", "🔋", "💡", "🔦", "🕯️", "📁", "📂", "📄", "📊", "📈", "📉", "📎"],
  },
  {
    label: "Tools",
    emojis: ["🔧", "🔨", "⚒️", "🛠️", "⚙️", "🔩", "🔗", "⛓️", "🪝", "🧲", "🗜️", "🪚", "🪛", "🪜", "🧰", "🔑", "🗝️", "🔐", "🔒", "🔓"],
  },
  {
    label: "Symbols",
    emojis: ["⭐", "🌟", "✨", "💥", "🔥", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "✅", "❌", "⚡", "💫", "🎯", "🏆"],
  },
  {
    label: "Nature",
    emojis: ["🌸", "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌿", "☘️", "🍀", "🌵", "🌴", "🌳", "🌲", "🍄", "🐶", "🐱", "🐭", "🐹", "🦊"],
  },
  {
    label: "Food",
    emojis: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥝", "🍕", "🍔", "🌮", "🌯", "🍜", "🍣", "🍩", "🎂", "☕"],
  },
  {
    label: "Activities",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎮", "🕹️", "🎲", "🎯", "🎵", "🎶", "🎤", "🎧", "🎸", "🎹", "🎺", "🥁", "🎬", "🎨"],
  },
];

export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string | null | undefined;
  onChange: (name: string) => void;
  color?: string | null;
}) {
  const currentType = getIconType(value);
  const [activeTab, setActiveTab] = useState<string>(currentType);
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrl, setCustomUrl] = useState(currentType === "custom" ? getIconValue(value) : "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lucideNames = Object.keys(iconMap);
  const filteredLucideNames = searchQuery
    ? lucideNames.filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()))
    : lucideNames;

  const handleEmojiSelect = (emoji: string) => {
    onChange(`emoji:${emoji}`);
  };

  const handleCustomUrlApply = () => {
    if (customUrl.trim()) {
      onChange(`custom:${customUrl.trim()}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomUrl(dataUrl);
      onChange(`custom:${dataUrl}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="lucide" className="flex-1 text-xs" data-testid="tab-icons">
          Icons
        </TabsTrigger>
        <TabsTrigger value="emoji" className="flex-1 text-xs" data-testid="tab-emoji">
          Emoji
        </TabsTrigger>
        <TabsTrigger value="custom" className="flex-1 text-xs" data-testid="tab-custom">
          Custom
        </TabsTrigger>
      </TabsList>

      <TabsContent value="lucide" className="mt-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 text-xs"
              data-testid="input-search-icons"
            />
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1">
          {filteredLucideNames.map((name) => {
            const Icon = iconMap[name];
            const isSelected = value === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={cn(
                  "flex items-center justify-center rounded-md p-2 transition-colors",
                  isSelected
                    ? "bg-primary/20 ring-1 ring-primary"
                    : "hover-elevate"
                )}
                title={name}
                data-testid={`icon-option-${name}`}
              >
                <Icon size={16} style={color ? { color } : undefined} />
              </button>
            );
          })}
          {filteredLucideNames.length === 0 && (
            <div className="col-span-8 py-4 text-center text-xs text-muted-foreground">
              No icons match "{searchQuery}"
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="emoji" className="mt-2">
        <div className="max-h-56 overflow-y-auto space-y-3">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.label}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 px-1">
                {category.label}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {category.emojis.map((emoji) => {
                  const isSelected = value === `emoji:${emoji}`;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={cn(
                        "flex items-center justify-center rounded-md p-1.5 text-base transition-colors",
                        isSelected
                          ? "bg-primary/20 ring-1 ring-primary"
                          : "hover-elevate"
                      )}
                      data-testid={`emoji-option-${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="custom" className="mt-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Upload an image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-icon"
              >
                <ImagePlus size={14} className="mr-1.5" />
                Choose File
              </Button>
              {currentType === "custom" && (
                <div className="flex items-center gap-2">
                  <img
                    src={getIconValue(value)}
                    alt="Current icon"
                    className="w-6 h-6 object-contain rounded-sm border border-border"
                  />
                  <span className="text-xs text-muted-foreground">Current icon</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-upload-icon"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs">Or paste an image URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/icon.png"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 text-xs"
                data-testid="input-custom-icon-url"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCustomUrlApply}
                disabled={!customUrl.trim()}
                data-testid="button-apply-custom-icon"
              >
                Apply
              </Button>
            </div>
          </div>

          {customUrl.trim() && (
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
              <img
                src={customUrl}
                alt="Preview"
                className="w-8 h-8 object-contain rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
