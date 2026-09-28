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

export const useBackgroundStore = create<BackgroundStore>((set) => ({
  background: DEFAULT_BACKGROUND_SETTINGS,
  weInfo: null,
  weConnected: false,
  weError: null,

  setBackground: (patch) =>
    set((state) => ({ background: { ...state.background, ...patch } })),

  setMode: (mode) =>
    set((state) => ({ background: { ...state.background, mode } })),

  setCustomImage: (customImagePath) =>
    set((state) => ({ background: { ...state.background, customImagePath } })),

  setDimOpacity: (dimOpacity) =>
    set((state) => ({
      background: {
        ...state.background,
        dimOpacity: Math.min(0.9, Math.max(0.0, Number(dimOpacity.toFixed(2)))),
      },
    })),

  setBlurRadius: (blurRadius) =>
    set((state) => ({
      background: {
        ...state.background,
        blurRadius: Math.min(20, Math.max(0, Math.round(blurRadius))),
      },
    })),

  setWeSyncColors: (weSyncColors) =>
    set((state) => ({ background: { ...state.background, weSyncColors } })),

  setWeInfo: (weInfo) => set({ weInfo }),
  setWeConnected: (weConnected) => set({ weConnected }),
  setWeError: (weError) => set({ weError }),

  restoreBackground: (saved) =>
    set((state) => ({
      background: {
        ...state.background,
        ...saved,
      },
    })),
}));
