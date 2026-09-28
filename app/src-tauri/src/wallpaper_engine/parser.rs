use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct WeWallpaperInfo {
    pub title: Option<String>,
    pub wallpaper_type: String, // "video" | "image" | "scene" | "unknown"
    pub media_path: String,
    pub is_video: bool,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PkgEntry {
    pub name: String,
    pub offset: u32,
    pub size: u32,
}

/// Đọc và phân tích file `config.json` của Wallpaper Engine để xác định wallpaper đang kích hoạt.
pub fn parse_active_wallpaper(
    config_path: &Path,
    cache_dir: &Path,
) -> Result<WeWallpaperInfo, String> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| format!("Failed to read WE config.json: {e}"))?;

    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse WE config.json: {e}"))?;

    let file_str = extract_wallpaper_file_from_json(&json)
        .ok_or_else(|| "No active wallpaper file found in Wallpaper Engine config".to_string())?;

    let mut target_path = PathBuf::from(&file_str);
    if !target_path.is_file() {
        // Có thể đường dẫn dùng forward slash hoặc relative
        let normalized = file_str.replace('/', "\\");
        let alt = PathBuf::from(normalized);
        if alt.is_file() {
            target_path = alt;
        } else {
            return Err(format!("Wallpaper file does not exist: {file_str}"));
        }
    }

    resolve_wallpaper_target(&target_path, cache_dir)
}

/// Trích xuất trường `file` từ cấu trúc `selectedwallpapers` trong JSON của Wallpaper Engine
fn extract_wallpaper_file_from_json(json: &serde_json::Value) -> Option<String> {
    // 1. Thử `wallpaperconfig.selectedwallpapers`
    if let Some(selected) = json
        .get("wallpaperconfig")
        .and_then(|wc| wc.get("selectedwallpapers"))
        .and_then(|sw| sw.as_object())
    {
        for (_monitor_id, config_val) in selected {
            if let Some(file) = config_val.get("file").and_then(|f| f.as_str()) {
                if !file.trim().is_empty() {
                    return Some(file.trim().to_string());
                }
            }
        }
    }

    // 2. Dự phòng: `wallpaperconfigrecent` (danh sách các wallpaper vừa chọn gần nhất)
    if let Some(recent_list) = json
        .get("wallpaperconfigrecent")
        .and_then(|r| r.as_array())
    {
        for recent in recent_list {
            if let Some(file) = recent
                .get("config")
                .and_then(|c| c.get("selectedwallpapers"))
                .and_then(|sw| sw.as_object())
                .and_then(|obj| {
                    obj.values().find_map(|v| v.get("file").and_then(|f| f.as_str()))
                })
            {
                if !file.trim().is_empty() {
                    return Some(file.trim().to_string());
                }
            }
        }
    }

    None
}

/// Xử lý tệp wallpaper mục tiêu: phân loại video, scene .pkg, hoặc ảnh tĩnh
pub fn resolve_wallpaper_target(
    target_path: &Path,
    cache_dir: &Path,
) -> Result<WeWallpaperInfo, String> {
    let parent_dir = target_path.parent().unwrap_or(target_path);
    let title = read_project_title(parent_dir).or_else(|| {
        target_path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
    });

    let ext = target_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    // 1. Trường hợp Wallpaper dạng Video (.mp4 / .webm)
    if ext == "mp4" || ext == "webm" {
        let thumbnail_path = find_companion_thumbnail(parent_dir);
        return Ok(WeWallpaperInfo {
            title,
            wallpaper_type: "video".to_string(),
            media_path: target_path.to_string_lossy().to_string(),
            is_video: true,
            thumbnail_path,
        });
    }

    // 2. Trường hợp Wallpaper dạng Scene đóng gói (.pkg)
    if ext == "pkg" {
        return parse_pkg_wallpaper(target_path, parent_dir, cache_dir, title);
    }

    // 3. Trường hợp Wallpaper dạng Ảnh tĩnh (.jpg / .jpeg / .png / .webp / .gif)
    if matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp" | "gif") {
        let path_str = target_path.to_string_lossy().to_string();
        return Ok(WeWallpaperInfo {
            title,
            wallpaper_type: "image".to_string(),
            media_path: path_str.clone(),
            is_video: false,
            thumbnail_path: Some(path_str),
        });
    }

    // 4. Nếu file là `project.json`
    if target_path.file_name().and_then(|n| n.to_str()) == Some("project.json") {
        return parse_project_json_target(target_path, cache_dir);
    }

    // Mặc định fallback nếu không nhận diện được định dạng
    let thumb = find_companion_thumbnail(parent_dir);
    Ok(WeWallpaperInfo {
        title,
        wallpaper_type: "unknown".to_string(),
        media_path: target_path.to_string_lossy().to_string(),
        is_video: false,
        thumbnail_path: thumb,
    })
}

/// Bộ phân giải nhị phân (Binary Parser) cho file .pkg của Wallpaper Engine.
/// Định dạng:
/// - Version string length (u32 little endian)
/// - Version string (e.g. "PKGV0001", "PKGV0019")
/// - File count (u32 little endian)
/// - For each file:
///   - Name length (u32)
///   - Name (UTF-8 bytes)
///   - Offset (u32 relative to data start)
///   - Size (u32)
pub fn parse_pkg_wallpaper(
    pkg_path: &Path,
    parent_dir: &Path,
    cache_dir: &Path,
    title: Option<String>,
) -> Result<WeWallpaperInfo, String> {
    let file = File::open(pkg_path).map_err(|e| format!("Failed to open .pkg file: {e}"))?;
    let mut reader = BufReader::new(file);

    let (version, entries, data_start) = parse_pkg_header(&mut reader)?;

    // Kiểm tra xem bên trong package có file video (.mp4/.webm) không
    let video_entry = entries.iter().find(|e| {
        let lower = e.name.to_ascii_lowercase();
        lower.ends_with(".mp4") || lower.ends_with(".webm")
    });

    if let Some(entry) = video_entry {
        // Trích xuất video vào thư mục cache
        let safe_name = entry.name.replace(['/', '\\'], "_");
        let out_path = cache_dir.join(format!("pkg_extracted_{safe_name}"));
        if !out_path.is_file() {
            let _ = std::fs::create_dir_all(cache_dir);
            extract_pkg_entry(&mut reader, data_start, entry, &out_path)?;
        }
        let thumbnail_path = find_companion_thumbnail(parent_dir);
        return Ok(WeWallpaperInfo {
            title,
            wallpaper_type: "video".to_string(),
            media_path: out_path.to_string_lossy().to_string(),
            is_video: true,
            thumbnail_path,
        });
    }

    // Nếu không có video, đây là Scene wallpaper:
    // 1. Tìm ảnh preview đồng hành trong thư mục (preview.jpg, preview.png, preview.gif...)
    if let Some(companion_thumb) = find_companion_thumbnail(parent_dir) {
        return Ok(WeWallpaperInfo {
            title,
            wallpaper_type: "scene".to_string(),
            media_path: companion_thumb.clone(),
            is_video: false,
            thumbnail_path: Some(companion_thumb),
        });
    }

    // 2. Nếu không có file thumbnail bên ngoài, tìm kiếm xem trong .pkg có file ảnh tĩnh không
    let img_entry = entries.iter().find(|e| {
        let lower = e.name.to_ascii_lowercase();
        lower.ends_with(".jpg")
            || lower.ends_with(".jpeg")
            || lower.ends_with(".png")
            || lower.ends_with(".webp")
    });

    if let Some(entry) = img_entry {
        let safe_name = entry.name.replace(['/', '\\'], "_");
        let out_path = cache_dir.join(format!("pkg_thumb_{safe_name}"));
        if !out_path.is_file() {
            let _ = std::fs::create_dir_all(cache_dir);
            let _ = extract_pkg_entry(&mut reader, data_start, entry, &out_path);
        }
        if out_path.is_file() {
            let p_str = out_path.to_string_lossy().to_string();
            return Ok(WeWallpaperInfo {
                title,
                wallpaper_type: "scene".to_string(),
                media_path: p_str.clone(),
                is_video: false,
                thumbnail_path: Some(p_str),
            });
        }
    }

    // Fallback nếu không trích xuất được
    Ok(WeWallpaperInfo {
        title,
        wallpaper_type: format!("scene ({version})"),
        media_path: pkg_path.to_string_lossy().to_string(),
        is_video: false,
        thumbnail_path: None,
    })
}

/// Đọc Header cấu trúc PKGV
pub fn parse_pkg_header<R: Read + Seek>(
    reader: &mut R,
) -> Result<(String, Vec<PkgEntry>, u64), String> {
    let mut buf4 = [0u8; 4];

    // 1. Độ dài chuỗi Version
    reader
        .read_exact(&mut buf4)
        .map_err(|e| format!("Failed to read version length: {e}"))?;
    let ver_len = u32::from_le_bytes(buf4) as usize;
    if ver_len == 0 || ver_len > 128 {
        return Err(format!("Invalid PKGV version length: {ver_len}"));
    }

    // 2. Chuỗi Version (e.g. PKGV0001, PKGV0019)
    let mut ver_buf = vec![0u8; ver_len];
    reader
        .read_exact(&mut ver_buf)
        .map_err(|e| format!("Failed to read version string: {e}"))?;
    let version = String::from_utf8_lossy(&ver_buf).to_string();
    if !version.starts_with("PKGV") {
        return Err(format!("Not a valid PKGV archive header: {version}"));
    }

    // 3. Số lượng tệp con
    reader
        .read_exact(&mut buf4)
        .map_err(|e| format!("Failed to read file count: {e}"))?;
    let file_count = u32::from_le_bytes(buf4) as usize;
    if file_count > 50_000 {
        return Err(format!("Excessive file count in PKGV: {file_count}"));
    }

    // 4. Đọc bảng mục lục tệp
    let mut entries = Vec::with_capacity(file_count);
    for _ in 0..file_count {
        reader
            .read_exact(&mut buf4)
            .map_err(|e| format!("Failed to read entry name length: {e}"))?;
        let name_len = u32::from_le_bytes(buf4) as usize;
        if name_len > 1024 {
            return Err("PKGV entry name too long".to_string());
        }

        let mut name_buf = vec![0u8; name_len];
        reader
            .read_exact(&mut name_buf)
            .map_err(|e| format!("Failed to read entry name: {e}"))?;
        let name = String::from_utf8_lossy(&name_buf).to_string();

        reader
            .read_exact(&mut buf4)
            .map_err(|e| format!("Failed to read entry offset: {e}"))?;
        let offset = u32::from_le_bytes(buf4);

        reader
            .read_exact(&mut buf4)
            .map_err(|e| format!("Failed to read entry size: {e}"))?;
        let size = u32::from_le_bytes(buf4);

        entries.push(PkgEntry { name, offset, size });
    }

    let data_start = reader
        .stream_position()
        .map_err(|e| format!("Failed to get stream position: {e}"))?;

    Ok((version, entries, data_start))
}

/// Trích xuất một file con từ PKGV ra đĩa
pub fn extract_pkg_entry<R: Read + Seek>(
    reader: &mut R,
    data_start: u64,
    entry: &PkgEntry,
    out_path: &Path,
) -> Result<(), String> {
    reader
        .seek(SeekFrom::Start(data_start + entry.offset as u64))
        .map_err(|e| format!("Failed to seek to entry data: {e}"))?;

    let mut out_file = File::create(out_path)
        .map_err(|e| format!("Failed to create extracted file {}: {e}", out_path.display()))?;

    let mut take_reader = reader.take(entry.size as u64);
    std::io::copy(&mut take_reader, &mut out_file)
        .map_err(|e| format!("Failed to copy entry bytes: {e}"))?;

    Ok(())
}

/// Đọc tiêu đề wallpaper từ file `project.json` trong thư mục
fn read_project_title(dir: &Path) -> Option<String> {
    let p_json = dir.join("project.json");
    if !p_json.is_file() {
        return None;
    }
    let content = std::fs::read_to_string(p_json).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&content).ok()?;
    parsed
        .get("title")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

/// Tìm file ảnh thumbnail/preview trong thư mục của wallpaper
fn find_companion_thumbnail(dir: &Path) -> Option<String> {
    let candidates = [
        "preview.jpg",
        "preview.png",
        "preview.jpeg",
        "preview.gif",
        "preview.webp",
    ];

    for name in &candidates {
        let p = dir.join(name);
        if p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    // Nếu có `project.json` chỉ định thuộc tính "preview"
    let p_json = dir.join("project.json");
    if p_json.is_file() {
        if let Ok(content) = std::fs::read_to_string(&p_json) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(prev) = parsed.get("preview").and_then(|p| p.as_str()) {
                    let custom_p = dir.join(prev);
                    if custom_p.is_file() {
                        return Some(custom_p.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    None
}

/// Xử lý trường hợp trỏ trực tiếp vào `project.json`
fn parse_project_json_target(
    project_json_path: &Path,
    cache_dir: &Path,
) -> Result<WeWallpaperInfo, String> {
    let parent_dir = project_json_path.parent().unwrap_or(project_json_path);
    let content = std::fs::read_to_string(project_json_path)
        .map_err(|e| format!("Failed to read project.json: {e}"))?;
    let parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project.json: {e}"))?;

    let title = parsed
        .get("title")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string());

    if let Some(file_rel) = parsed.get("file").and_then(|f| f.as_str()) {
        let target = parent_dir.join(file_rel);
        if target.is_file() {
            return resolve_wallpaper_target(&target, cache_dir);
        }
    }

    let thumb = find_companion_thumbnail(parent_dir);
    Ok(WeWallpaperInfo {
        title,
        wallpaper_type: "scene".to_string(),
        media_path: thumb.clone().unwrap_or_default(),
        is_video: false,
        thumbnail_path: thumb,
    })
}
