import { create } from "zustand";

export type BackgroundMode = "solid" | "custom_image" | "wallpaper_engine";

export interface BackgroundSettings {
  mode: BackgroundMode;
  customImagePath: string | null;
  dimOpacity: number; // 0.0 - 0.9 (Lớp phủ tối để nổi bật text terminal)
  blurRadius: number; // 0px - 20px (Làm mờ nền)
  weSyncColors: boolean; // Có đồng bộ màu HCT theo wallpaper hay không
}

export interface WeWallpaperInfo {
  title: string | null;
  wallpaper_type: string; // "video" | "image" | "scene" | "unknown"
  media_path: string;
  is_video: boolean;
  thumbnail_path: string | null;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: "solid",
  customImagePath: null,
  dimOpacity: 0.35,
  blurRadius: 0,
  weSyncColors: true,
};

interface BackgroundStore {
  background: BackgroundSettings;
  weInfo: WeWallpaperInfo | null;
  weConnected: boolean;
  weError: string | null;

  setBackground: (patch: Partial<BackgroundSettings>) => void;
  setMode: (mode: BackgroundMode) => void;
  setCustomImage: (path: string | null) => void;
  setDimOpacity: (dim: number) => void;
  setBlurRadius: (blur: number) => void;
  setWeSyncColors: (sync: boolean) => void;
  setWeInfo: (info: WeWallpaperInfo | null) => void;
  setWeConnected: (connected: boolean) => void;
  setWeError: (error: string | null) => void;
  restoreBackground: (saved: Partial<BackgroundSettings>) => void;
}

const BG_SETTINGS_KEY = "binbox:background-settings";

function loadSavedSettings(): BackgroundSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(BG_SETTINGS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BACKGROUND_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_BACKGROUND_SETTINGS;
}

function saveSettings(settings: BackgroundSettings) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {}
}

export const useBackgroundStore = create<BackgroundStore>((set) => ({
  background: loadSavedSettings(),
  weInfo: null,
  weConnected: false,
  weError: null,

  setBackground: (patch) =>
    set((state) => {
      const next = { ...state.background, ...patch };
      saveSettings(next);
      return { background: next };
    }),

  setMode: (mode) =>
    set((state) => {
      const next = { ...state.background, mode };
      saveSettings(next);
      return { background: next };
    }),

  setCustomImage: (customImagePath) =>
    set((state) => {
      const next = { ...state.background, customImagePath };
      saveSettings(next);
      return { background: next };
    }),

  setDimOpacity: (dimOpacity) =>
    set((state) => {
      const next = {
        ...state.background,
        dimOpacity: Math.min(0.9, Math.max(0.0, Number(dimOpacity.toFixed(2)))),
      };
      saveSettings(next);
      return { background: next };
    }),

  setBlurRadius: (blurRadius) =>
    set((state) => {
      const next = {
        ...state.background,
        blurRadius: Math.min(20, Math.max(0, Math.round(blurRadius))),
      };
      saveSettings(next);
      return { background: next };
    }),

  setWeSyncColors: (weSyncColors) =>
    set((state) => {
      const next = { ...state.background, weSyncColors };
      saveSettings(next);
      return { background: next };
    }),

  setWeInfo: (weInfo) => set({ weInfo }),
  setWeConnected: (weConnected) => set({ weConnected }),
  setWeError: (weError) => set({ weError }),

  restoreBackground: (saved) =>
    set((state) => {
      const next = {
        ...state.background,
        ...saved,
      };
      saveSettings(next);
      return { background: next };
    }),
}));
