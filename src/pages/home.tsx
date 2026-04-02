import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import * as api from "@/lib/tauri-api";
import { refreshTrayMenu, reparentMenuItem, isTauri, checkPath, getFileIcon, onNativeFileDrop } from "@/lib/tauri-api";
import { MenuPreview } from "@/components/menu-preview";
import { SettingsPanel } from "@/components/settings-panel";
import { AddItemDialog, type AddItemInitialValues } from "@/components/add-item-dialog";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { ProfileDialog } from "@/components/profile-dialog";
import { DEFAULT_SETTINGS } from "@/lib/menu-store";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Moon, Sun, Settings, Download, Upload, Plus, Pencil, Trash2, Users, ArrowLeft,
} from "lucide-react";
import { IconRenderer } from "@/components/icon-renderer";
import type { MenuItem, MenuSettings, MenuProfile, InsertProfile } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import appIconPath from "@assets/menumaestro_icon_1770841624005.png";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dropInitialValues, setDropInitialValues] = useState<AddItemInitialValues | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<MenuProfile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ─── Native file drop (from desktop into the app) ─────────────────────────

  const handleFileDropRef = useRef<(values: AddItemInitialValues) => void>();
  handleFileDropRef.current = (values: AddItemInitialValues) => {
    setDropInitialValues(values);
    setAddDialogOpen(true);
  };

  useEffect(() => {
    if (!isTauri()) return;
    onNativeFileDrop(async (filePaths: string[]) => {
      if (filePaths.length === 0) return;
      setIsDragOver(false);
      const filePath = filePaths[0];
      let isDirectory = false;
      try { const r = await checkPath(filePath); isDirectory = r.isDirectory || false; } catch {}
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      const type: "program" | "file" | "folder" = isDirectory ? "folder"
        : ["exe", "bat", "cmd", "lnk", "ps1", "msi"].includes(ext) ? "program" : "file";
      const parts = filePath.replace(/\\/g, "/").split("/");
      const filename = parts[parts.length - 1] || "";
      const label = type === "program" ? filename.replace(/\.(exe|bat|cmd|lnk|ps1|msi)$/i, "") : filename;
      let iconName: string | undefined;
      try { const ic = await getFileIcon(filePath); if (ic) iconName = ic; } catch {}
      if (!iconName) iconName = type === "folder" ? "Folder" : type === "program" ? "Terminal" : "FileText";
      handleFileDropRef.current?.({
        type, label, shortcutPath: filePath, iconName,
        iconColor: type === "program" ? "#3b82f6" : type === "folder" ? "#facc15" : "#a78bfa",
        folderAction: type === "folder" ? "open" : undefined,
      });
    });
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const onOver = (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer?.types.includes("Files")) setIsDragOver(true); };
    const onLeave = (e: DragEvent) => { if (e.relatedTarget === null) setIsDragOver(false); };
    const onDrop = () => setIsDragOver(false);
    document.addEventListener("dragover", onOver);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("drop", onDrop);
    return () => { document.removeEventListener("dragover", onOver); document.removeEventListener("dragleave", onLeave); document.removeEventListener("drop", onDrop); };
  }, []);

  // ─── Queries (Tauri invoke instead of fetch) ───────────────────────────────

  const { data: mainItems = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["menu-items"],
    queryFn: () => api.getMenuItems(),
  });

  const { data: mainSettings, isLoading: settingsLoading } = useQuery<MenuSettings>({
    queryKey: ["menu-settings"],
    queryFn: () => api.getMenuSettings(),
  });

  const { data: profiles = [] } = useQuery<MenuProfile[]>({
    queryKey: ["profiles"],
    queryFn: () => api.getProfiles(),
  });

  const { data: profileItems = [], isLoading: profileItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["profiles", activeProfileId, "menu-items"],
    queryFn: () => api.getProfileMenuItems(activeProfileId!),
    enabled: !!activeProfileId,
  });

  const { data: profileSettings, isLoading: profileSettingsLoading } = useQuery<Omit<MenuSettings, "id">>({
    queryKey: ["profiles", activeProfileId, "menu-settings"],
    queryFn: () => api.getProfileSettings(activeProfileId!) as any,
    enabled: !!activeProfileId,
  });

  const items = activeProfileId ? profileItems : mainItems;

  const resolveSettings = (s: MenuSettings | Omit<MenuSettings, "id"> | undefined): Omit<MenuSettings, "id"> => {
    if (!s) return DEFAULT_SETTINGS;
    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      iconSize: s.iconSize ?? 16,
      itemSpacing: s.itemSpacing,
      accentColor: s.accentColor,
      backgroundColor: s.backgroundColor,
      textColor: s.textColor,
      menuWidth: s.menuWidth,
      menuHeight: s.menuHeight ?? 600,
      borderRadius: s.borderRadius,
      separatorColor: s.separatorColor,
      hoverColor: s.hoverColor,
      submenuDirection: s.submenuDirection ?? "vertical" as const,
      menuStyle: s.menuStyle ?? "none" as const,
      borderStyle: s.borderStyle ?? "flat" as const,
      borderThickness: s.borderThickness ?? "thin" as const,
      borderColor: s.borderColor ?? "#45475a",
      gradientColorMid: s.gradientColorMid ?? "#2a2a3e",
      gradientColorEnd: s.gradientColorEnd ?? "#3a3a5e",
    };
  };

  const currentSettings = activeProfileId
    ? resolveSettings(profileSettings)
    : resolveSettings(mainSettings);

  const mainResolvedSettings = resolveSettings(mainSettings);

  // ─── Mutations (Tauri invoke) ──────────────────────────────────────────────

  const onMutationError = (err: Error) => {
    toast({ title: "Error", description: err.message, variant: "destructive" });
  };

  const onItemMutationSuccess = () => {
    if (activeProfileId) {
      queryClient.invalidateQueries({ queryKey: ["profiles", activeProfileId, "menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    }
    refreshTrayMenu();
  };

  const addItemMutation = useMutation({
    mutationFn: async (item: {
      type: "program" | "file" | "folder" | "separator" | "url" | "menu";
      label?: string;
      shortcutPath?: string;
      iconName?: string;
      iconColor?: string;
      parentId?: string | null;
      folderAction?: "expand" | "open" | null;
    }) => {
      if (activeProfileId) {
        return api.createProfileMenuItem(activeProfileId, item);
      }
      return api.createMenuItem(item);
    },
    onSuccess: onItemMutationSuccess,
    onError: onMutationError,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MenuItem> }) => {
      if (activeProfileId) {
        return api.updateProfileMenuItem(activeProfileId, id, updates);
      }
      return api.updateMenuItem(id, updates);
    },
    onSuccess: onItemMutationSuccess,
    onError: onMutationError,
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      if (activeProfileId) {
        return api.deleteProfileMenuItem(activeProfileId, id);
      }
      return api.deleteMenuItem(id);
    },
    onSuccess: onItemMutationSuccess,
    onError: onMutationError,
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ activeId, overId }: { activeId: string; overId: string }) => {
      if (activeProfileId) {
        return api.reorderProfileMenuItems(activeProfileId, activeId, overId);
      }
      return api.reorderMenuItems(activeId, overId);
    },
    onSuccess: onItemMutationSuccess,
    onError: onMutationError,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<MenuSettings, "id">>) => {
      if (activeProfileId) {
        return api.updateProfileSettings(activeProfileId, updates);
      }
      return api.updateMenuSettings(updates);
    },
    onSuccess: () => {
      if (activeProfileId) {
        queryClient.invalidateQueries({ queryKey: ["profiles", activeProfileId, "menu-settings"] });
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
      }
    },
    onError: onMutationError,
  });

  const createProfileMutation = useMutation({
    mutationFn: (data: InsertProfile) => api.createProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Profile created" });
    },
    onError: onMutationError,
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertProfile> }) =>
      api.updateProfile(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Profile updated" });
    },
    onError: onMutationError,
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) => api.deleteProfile(id),
    onSuccess: (_, deletedId) => {
      if (activeProfileId === deletedId) setActiveProfileId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast({ title: "Profile deleted" });
    },
    onError: onMutationError,
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddItem = useCallback(
    (item: Parameters<typeof addItemMutation.mutate>[0]) => {
      addItemMutation.mutate(item);
    },
    [addItemMutation]
  );

  const handleEditItem = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, updates: Partial<MenuItem>) => {
      updateItemMutation.mutate({ id, updates });
    },
    [updateItemMutation]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      deleteItemMutation.mutate(id);
    },
    [deleteItemMutation]
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      reorderMutation.mutate({ activeId, overId });
    },
    [reorderMutation]
  );

  const reparentMutation = useMutation({
    mutationFn: async ({ itemId, newParentId }: { itemId: string; newParentId: string | null }) => {
      return reparentMenuItem(itemId, newParentId);
    },
    onSuccess: onItemMutationSuccess,
    onError: onMutationError,
  });

  const handleReparent = useCallback(
    (itemId: string, newParentId: string | null) => {
      reparentMutation.mutate({ itemId, newParentId });
    },
    [reparentMutation]
  );

  const handleToggleExpand = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        updateItemMutation.mutate({
          id,
          updates: { isExpanded: !item.isExpanded },
        });
      }
    },
    [items, updateItemMutation]
  );

  const handleSettingsChange = useCallback(
    (updates: Partial<Omit<MenuSettings, "id">>) => {
      updateSettingsMutation.mutate(updates);
    },
    [updateSettingsMutation]
  );

  const handleProfileClick = useCallback((profileId: string | null) => {
    setActiveProfileId(profileId);
  }, []);

  const handleBackup = useCallback(async () => {
    try {
      const data = await api.exportData();
      const jsonStr = JSON.stringify(data, null, 2);

      // Use native save dialog in Tauri
      if (api.isTauri()) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const filePath = await save({
          defaultPath: `menumaestro-backup-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (filePath) {
          await writeTextFile(filePath, jsonStr);
          toast({ title: "Backup saved", description: `Saved to ${filePath}` });
        }
      } else {
        // Fallback for non-Tauri
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `menumaestro-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Backup saved", description: "Your layout has been downloaded." });
      }
    } catch (err) {
      toast({ title: "Backup failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  }, [toast]);

  const handleRestore = useCallback(async () => {
    try {
      if (api.isTauri()) {
        const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const filePath = await openDialog({
          filters: [{ name: "JSON", extensions: ["json"] }],
          multiple: false,
        });
        if (!filePath) return;
        const text = await readTextFile(filePath as string);
        const data = JSON.parse(text);
        if (!data.menuItems || !data.menuSettings) {
          toast({ title: "Invalid backup file", variant: "destructive" });
          return;
        }
        await api.importData(data);
        queryClient.invalidateQueries({ queryKey: ["menu-items"] });
        queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        refreshTrayMenu();
        toast({ title: "Layout restored", description: "Your backup has been loaded." });
      } else {
        // Fallback for non-Tauri
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.menuItems || !data.menuSettings) {
              toast({ title: "Invalid backup file", variant: "destructive" });
              return;
            }
            await api.importData(data);
            queryClient.invalidateQueries({ queryKey: ["menu-items"] });
            queryClient.invalidateQueries({ queryKey: ["menu-settings"] });
            queryClient.invalidateQueries({ queryKey: ["profiles"] });
            refreshTrayMenu();
            toast({ title: "Layout restored", description: "Your backup has been loaded." });
          } catch {
            toast({ title: "Restore failed", description: "Could not parse backup file.", variant: "destructive" });
          }
        };
        input.click();
      }
    } catch {
      toast({ title: "Restore failed", description: "Could not parse backup file.", variant: "destructive" });
    }
  }, [toast]);

  const folders = items.filter((i) => i.type === "menu" || (i.type === "folder" && (i.folderAction || "expand") === "expand"));
  const isLoading = activeProfileId
    ? (profileItemsLoading || profileSettingsLoading)
    : (itemsLoading || settingsLoading);

  const activeProfile = activeProfileId ? profiles.find(p => p.id === activeProfileId) : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={appIconPath} alt="MenuMaestro" className="w-8 h-8 rounded-md" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">MenuMaestro</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              System Tray Menu Builder
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleBackup}
            title="Backup layout"
            data-testid="button-backup"
          >
            <Download size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRestore}
            title="Restore layout"
            data-testid="button-restore"
          >
            <Upload size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? "text-primary" : ""}
            data-testid="button-toggle-settings"
          >
            <Settings size={16} />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Profiles bar */}
        <div className="w-[220px] border-r border-border flex flex-col bg-background min-h-0">
          <div className="border-b border-border">
            {activeProfileId && activeProfile ? (
              <div className="flex items-center gap-2 px-4 py-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveProfileId(null)}
                  title="Back to main menu"
                  data-testid="button-back-to-main"
                >
                  <ArrowLeft size={14} />
                </Button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <IconRenderer name={activeProfile.iconName} color={activeProfile.iconColor} size={14} />
                  <span className="text-sm font-medium truncate">{activeProfile.name}</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 px-4 py-2">
              <Users size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profiles</span>
              <div className="flex-1" />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingProfile(null);
                  setProfileDialogOpen(true);
                }}
                title="Add profile"
                data-testid="button-add-profile"
              >
                <Plus size={14} />
              </Button>
            </div>

            {profiles.length > 0 && (
              <div className="flex flex-col gap-1 px-4 pb-2">
                {profiles.map((profile) => {
                  const isActive = activeProfileId === profile.id;
                  return (
                    <div key={profile.id} className="flex items-center gap-0.5 group">
                      <Button
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        onClick={() => setActiveProfileId(isActive ? null : profile.id)}
                        className="gap-1.5 flex-1 justify-start"
                        data-testid={`button-select-profile-${profile.id}`}
                      >
                        {profile.showIcon && (
                          <IconRenderer
                            name={profile.iconName}
                            color={isActive ? undefined : profile.iconColor}
                            size={12}
                          />
                        )}
                        {profile.showText && (
                          <span className="truncate">{profile.name}</span>
                        )}
                      </Button>
                      <div className="flex invisible group-hover:visible">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProfile(profile);
                            setProfileDialogOpen(true);
                          }}
                          title="Edit profile"
                          data-testid={`button-edit-profile-${profile.id}`}
                        >
                          <Pencil size={10} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProfileMutation.mutate(profile.id);
                          }}
                          title="Delete profile"
                          data-testid={`button-delete-profile-${profile.id}`}
                        >
                          <Trash2 size={10} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main preview area — now the editor */}
        <div className="flex-1 bg-muted/30 overflow-y-auto min-h-0 relative">
          {isDragOver && (
            <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center text-center p-8 rounded-xl border-2 border-dashed border-primary/30 bg-background/95">
                <div className="rounded-full bg-primary/10 p-4 mb-3">
                  <Download size={32} className="text-primary" />
                </div>
                <p className="text-base font-medium text-primary">Drop to add</p>
                <p className="text-xs text-muted-foreground mt-1">Programs, files, folders, and shortcuts</p>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-64 w-64 rounded-lg" />
            </div>
          ) : (
            <MenuPreview
              items={activeProfileId ? profileItems : mainItems}
              settings={activeProfileId ? currentSettings : mainResolvedSettings}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onProfileClick={handleProfileClick}
              onReorder={handleReorder}
              onReparent={handleReparent}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onToggleExpand={handleToggleExpand}
              onAddClick={() => { setDropInitialValues(null); setAddDialogOpen(true); }}
            />
          )}
        </div>

        {showSettings && (
          <div className="w-[280px] border-l border-border bg-background flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Settings size={14} className="text-muted-foreground" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {activeProfileId ? "Profile Appearance" : "Appearance"}
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {settingsLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <SettingsPanel settings={currentSettings} onChange={handleSettingsChange} />
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setDropInitialValues(null);
        }}
        onAdd={handleAddItem}
        folders={folders}
        allItems={items}
        initialValues={dropInitialValues}
      />

      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={editingItem}
        onSave={handleSaveEdit}
        folders={folders}
        allItems={items}
      />

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={editingProfile}
        onSave={(data) => {
          if (editingProfile) {
            updateProfileMutation.mutate({ id: editingProfile.id, updates: data });
          } else {
            createProfileMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
