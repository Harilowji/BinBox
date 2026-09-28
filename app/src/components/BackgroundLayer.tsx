import { useEffect, useRef } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useBackgroundStore, type WeWallpaperInfo } from "../store/settings";
import { setCustomWallpaper } from "../theme/useTheme";

export function BackgroundLayer() {
  const {
    background,
    weInfo,
    setWeInfo,
    setWeConnected,
    setWeError,
  } = useBackgroundStore();

  const { mode, customImagePath, dimOpacity, blurRadius, weSyncColors } = background;
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Quản lý vòng đời (Conditional Lifecycle) của backend Wallpaper Engine
  useEffect(() => {
    let unlistenPalette: (() => void) | null = null;
    let unlistenChange: (() => void) | null = null;

    if (mode === "wallpaper_engine") {
      // Bật tiến trình giám sát native trong Rust
      invoke("we_set_active", { active: true })
        .then(() => {
          setWeConnected(true);
          setWeError(null);
        })
        .catch((err) => {
          setWeConnected(false);
          setWeError(String(err));
        });

      // Lấy trạng thái hiện tại ngay lập tức
      invoke<WeWallpaperInfo | null>("we_get_current")
        .then((info) => {
          if (info) {
            setWeInfo(info);
            setWeConnected(true);
            if (weSyncColors) {
              const thumb = info.thumbnail_path || (!info.is_video ? info.media_path : null);
              if (thumb) {
                void setCustomWallpaper(thumb);
              }
            }
          }
        })
        .catch((err) => {
          setWeError(String(err));
        });

      // Lắng nghe sự kiện cập nhật từ Rust notify watcher
      listen<WeWallpaperInfo>("tauri://wallpaper-palette-updated", (event) => {
        const info = event.payload;
        setWeInfo(info);
        setWeConnected(true);
        if (useBackgroundStore.getState().background.weSyncColors) {
          const thumb = info.thumbnail_path || (!info.is_video ? info.media_path : null);
          if (thumb) {
            void setCustomWallpaper(thumb);
          }
        }
      }).then((fn) => {
        unlistenPalette = fn;
      });

      listen<WeWallpaperInfo>("wallpaper-engine:changed", (event) => {
        setWeInfo(event.payload);
        setWeConnected(true);
      }).then((fn) => {
        unlistenChange = fn;
      });
    } else {
      // Hủy tiến trình giám sát trong Rust ngay lập tức để duy trì 0.0% CPU
      invoke("we_set_active", { active: false }).catch(() => {});
    }

    return () => {
      unlistenPalette?.();
      unlistenChange?.();
    };
  }, [mode, weSyncColors, setWeInfo, setWeConnected, setWeError]);

  // 2. Gắn hook kiểm tra cửa sổ: Tự động pause video khi mất focus / minimize
  useEffect(() => {
    if (mode !== "wallpaper_engine" || !weInfo?.is_video) {
      return;
    }

    const handleFocus = () => {
      videoRef.current?.play().catch(() => {});
    };

    const handleBlur = () => {
      videoRef.current?.pause();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play().catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    let unlistenFocus: (() => void) | null = null;
    let unlistenBlur: (() => void) | null = null;

    listen("tauri://focus", handleFocus).then((fn) => {
      unlistenFocus = fn;
    });
    listen("tauri://blur", handleBlur).then((fn) => {
      unlistenBlur = fn;
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      unlistenFocus?.();
      unlistenBlur?.();
    };
  }, [mode, weInfo?.is_video]);

  // Chế độ 'solid' không render media nào để duy trì 0.0% GPU
  if (mode === "solid") {
    return null;
  }

  return (
    <div
      className="unified-bg-container"
      data-tauri-drag-region
      style={
        {
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          overflow: "hidden",
          "--bg-dim-opacity": dimOpacity,
          "--bg-blur-radius": `${blurRadius}px`,
        } as React.CSSProperties
      }
    >
      {/* 1. Ảnh tĩnh tùy chọn (Custom Image) */}
      {mode === "custom_image" && customImagePath && (
        <img
          src={convertFileSrc(customImagePath)}
          alt=""
          className="unified-bg-media"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: blurRadius > 0 ? `blur(${blurRadius}px)` : "none",
            transform: blurRadius > 0 ? "scale(1.05)" : "none",
          }}
        />
      )}

      {/* 2. Wallpaper Engine (Video hoặc Scene Image) */}
      {mode === "wallpaper_engine" && weInfo?.media_path && (
        weInfo.is_video ? (
          <video
            ref={videoRef}
            src={convertFileSrc(weInfo.media_path)}
            autoPlay
            loop
            muted
            playsInline
            className="unified-bg-media"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: blurRadius > 0 ? `blur(${blurRadius}px)` : "none",
              transform: blurRadius > 0 ? "scale(1.05)" : "none",
            }}
          />
        ) : (
          <img
            src={convertFileSrc(weInfo.media_path)}
            alt={weInfo.title || ""}
            className="unified-bg-media"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: blurRadius > 0 ? `blur(${blurRadius}px)` : "none",
              transform: blurRadius > 0 ? "scale(1.05)" : "none",
            }}
          />
        )
      )}

      {/* Lớp phủ tối (Dim Overlay) và làm mờ (Blur) */}
      {dimOpacity > 0 && (
        <div
          className="unified-bg-overlay"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(10, 10, 10, ${dimOpacity})`,
          }}
        />
      )}
    </div>
  );
}
