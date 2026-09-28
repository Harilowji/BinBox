use super::detector::{detect_we_dir, get_config_file};
use super::parser::{parse_active_wallpaper, WeWallpaperInfo};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct WeManager {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    is_active: Arc<AtomicBool>,
    last_info: Arc<Mutex<Option<WeWallpaperInfo>>>,
    last_trigger: Arc<Mutex<Instant>>,
}

impl Default for WeManager {
    fn default() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            is_active: Arc::new(AtomicBool::new(false)),
            last_info: Arc::new(Mutex::new(None)),
            last_trigger: Arc::new(Mutex::new(Instant::now())),
        }
    }
}

impl WeManager {
    /// Bật hoặc tắt tiến trình giám sát Wallpaper Engine.
    /// Khi tắt (active == false), watcher OS bị drop ngay lập tức, trả lại 0.0% CPU.
    pub fn set_active(&self, app: &AppHandle, active: bool) -> Result<(), String> {
        if !active {
            self.is_active.store(false, Ordering::SeqCst);
            let mut w_lock = self.watcher.lock().map_err(|e| e.to_string())?;
            *w_lock = None;
            return Ok(());
        }

        self.is_active.store(true, Ordering::SeqCst);

        let Some(we_dir) = detect_we_dir() else {
            return Err("Wallpaper Engine directory not found on system".to_string());
        };

        let Some(config_path) = get_config_file(&we_dir) else {
            return Err("Wallpaper Engine config.json not found".to_string());
        };

        let cache_dir = get_cache_dir(app)?;

        // 1. Phân tích trạng thái hiện tại ngay lập tức qua spawn_blocking
        let app_handle = app.clone();
        let cfg_clone = config_path.clone();
        let cache_clone = cache_dir.clone();
        let last_info = Arc::clone(&self.last_info);

        tauri::async_runtime::spawn_blocking(move || {
            if let Ok(info) = parse_active_wallpaper(&cfg_clone, &cache_clone) {
                let mut info_lock = last_info.lock().unwrap();
                *info_lock = Some(info.clone());
                let _ = app_handle.emit("tauri://wallpaper-palette-updated", &info);
                let _ = app_handle.emit("wallpaper-engine:changed", &info);
            }
        });

        // 2. Thiết lập watcher bằng notify
        let mut w_lock = self.watcher.lock().map_err(|e| e.to_string())?;
        if w_lock.is_none() {
            let app_handle = app.clone();
            let is_active = Arc::clone(&self.is_active);
            let last_trigger = Arc::clone(&self.last_trigger);
            let last_info = Arc::clone(&self.last_info);
            let cfg_clone = config_path.clone();
            let cache_clone = cache_dir.clone();

            let target_file_name = config_path
                .file_name()
                .map(|n| n.to_string_lossy().to_ascii_lowercase())
                .unwrap_or_else(|| "config.json".to_string());

            let watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
                if !is_active.load(Ordering::SeqCst) {
                    return;
                }

                if let Ok(event) = res {
                    match event.kind {
                        EventKind::Modify(_) | EventKind::Create(_) => {
                            let touches_config = event.paths.iter().any(|p| {
                                p.file_name()
                                    .map(|n| {
                                        n.to_string_lossy().to_ascii_lowercase()
                                            == target_file_name
                                    })
                                    .unwrap_or(false)
                            });

                            if touches_config {
                                // Debounce 250ms
                                {
                                    let mut trig = last_trigger.lock().unwrap();
                                    if trig.elapsed().as_millis() < 250 {
                                        return;
                                    }
                                    *trig = Instant::now();
                                }

                                let app_cloned = app_handle.clone();
                                let cfg_cloned = cfg_clone.clone();
                                let cache_cloned = cache_clone.clone();
                                let last_info_cloned = Arc::clone(&last_info);

                                // Chạy I/O trên background thread không chặn main thread
                                tauri::async_runtime::spawn_blocking(move || {
                                    // Đợi một khoảng ngắn để Wallpaper Engine hoàn tất ghi file
                                    std::thread::sleep(std::time::Duration::from_millis(80));

                                    if let Ok(new_info) =
                                        parse_active_wallpaper(&cfg_cloned, &cache_cloned)
                                    {
                                        let mut info_lock = last_info_cloned.lock().unwrap();
                                        let changed = match &*info_lock {
                                            Some(old) => old != &new_info,
                                            None => true,
                                        };

                                        if changed {
                                            *info_lock = Some(new_info.clone());
                                            let _ = app_cloned.emit(
                                                "tauri://wallpaper-palette-updated",
                                                &new_info,
                                            );
                                            let _ = app_cloned
                                                .emit("wallpaper-engine:changed", &new_info);
                                        }
                                    }
                                });
                            }
                        }
                        _ => {}
                    }
                }
            })
            .map_err(|e| e.to_string())?;

            let mut watcher = watcher;
            // Giám sát thư mục cha của config.json
            let watch_target = config_path.parent().unwrap_or(&config_path);
            watcher
                .watch(watch_target, RecursiveMode::NonRecursive)
                .map_err(|e| e.to_string())?;

            *w_lock = Some(watcher);
        }

        Ok(())
    }

    /// Lấy thông tin wallpaper hiện tại
    pub fn get_current(&self, app: &AppHandle) -> Result<Option<WeWallpaperInfo>, String> {
        let cached = self.last_info.lock().map_err(|e| e.to_string())?.clone();
        if cached.is_some() {
            return Ok(cached);
        }

        let Some(we_dir) = detect_we_dir() else {
            return Ok(None);
        };
        let Some(config_path) = get_config_file(&we_dir) else {
            return Ok(None);
        };

        let cache_dir = get_cache_dir(app)?;
        let info = parse_active_wallpaper(&config_path, &cache_dir).ok();
        if let Some(ref i) = info {
            let mut lock = self.last_info.lock().map_err(|e| e.to_string())?;
            *lock = Some(i.clone());
        }

        Ok(info)
    }
}

fn get_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("assets")
        .join("we_cache");
    let _ = std::fs::create_dir_all(&dir);
    Ok(dir)
}

#[tauri::command]
pub fn we_set_active(
    app: AppHandle,
    state: State<'_, WeManager>,
    active: bool,
) -> Result<(), String> {
    state.set_active(&app, active)
}

#[tauri::command]
pub fn we_get_current(
    app: AppHandle,
    state: State<'_, WeManager>,
) -> Result<Option<WeWallpaperInfo>, String> {
    state.get_current(&app)
}
