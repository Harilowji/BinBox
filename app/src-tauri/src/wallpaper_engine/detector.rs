use std::path::{Path, PathBuf};

/// Dò tìm thư mục cài đặt Wallpaper Engine trên Windows.
/// Ưu tiên:
/// 1. Biến môi trường `BINBOX_WE_DIR` hoặc `WALLPAPER_ENGINE_DIR` (nếu người dùng chỉ định thủ công).
/// 2. Registry Steam (`SteamPath` trong HKCU hoặc InstallPath trong HKLM).
/// 3. Phân tích file `libraryfolders.vdf` để duyệt qua toàn bộ các ổ đĩa chứa thư viện Steam.
/// 4. Các đường dẫn mặc định thông dụng trên Windows (C:, D:, E:...).
pub fn detect_we_dir() -> Option<PathBuf> {
    // 1. Biến môi trường override
    if let Some(dir) = std::env::var_os("BINBOX_WE_DIR").or_else(|| std::env::var_os("WALLPAPER_ENGINE_DIR")) {
        let p = PathBuf::from(dir);
        if is_valid_we_dir(&p) {
            return Some(p);
        }
    }

    // 2. Dò Steam Path từ Registry
    #[cfg(target_os = "windows")]
    {
        if let Some(steam_path) = get_steam_path_from_registry() {
            // Kiểm tra ngay trong thư mục Steam chính
            let default_we = steam_path.join("steamapps").join("common").join("wallpaper_engine");
            if is_valid_we_dir(&default_we) {
                return Some(default_we);
            }

            // Đọc `libraryfolders.vdf` để tìm tất cả các thư viện Steam trên các ổ đĩa khác
            let vdf_path = steam_path.join("steamapps").join("libraryfolders.vdf");
            if vdf_path.is_file() {
                for lib in parse_library_folders(&vdf_path) {
                    let we_path = lib.join("steamapps").join("common").join("wallpaper_engine");
                    if is_valid_we_dir(&we_path) {
                        return Some(we_path);
                    }
                }
            }
        }
    }

    // 3. Quét các ổ đĩa thông dụng
    let common_locations = [
        r"C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine",
        r"C:\Program Files\Steam\steamapps\common\wallpaper_engine",
        r"D:\Steam\steamapps\common\wallpaper_engine",
        r"D:\SteamLibrary\steamapps\common\wallpaper_engine",
        r"E:\Steam\steamapps\common\wallpaper_engine",
        r"E:\SteamLibrary\steamapps\common\wallpaper_engine",
        r"F:\Steam\steamapps\common\wallpaper_engine",
        r"F:\SteamLibrary\steamapps\common\wallpaper_engine",
    ];

    for path_str in &common_locations {
        let p = PathBuf::from(path_str);
        if is_valid_we_dir(&p) {
            return Some(p);
        }
    }

    None
}

/// Kiểm tra thư mục có phải là Wallpaper Engine hợp lệ (có config.json hoặc wallpaper32.exe / wallpaper64.exe)
pub fn is_valid_we_dir(path: &Path) -> bool {
    if !path.is_dir() {
        return false;
    }
    path.join("config.json").is_file()
        || path.join("wallpaper32.exe").is_file()
        || path.join("wallpaper64.exe").is_file()
}

/// Tìm file `config.json` từ thư mục Wallpaper Engine.
pub fn get_config_file(we_dir: &Path) -> Option<PathBuf> {
    let direct = we_dir.join("config.json");
    if direct.is_file() {
        return Some(direct);
    }
    // Một số bản portable có thể để ở distribution/config.json
    let dist = we_dir.join("distribution").join("config.json");
    if dist.is_file() {
        return Some(dist);
    }
    None
}

#[cfg(target_os = "windows")]
fn get_steam_path_from_registry() -> Option<PathBuf> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    // HKCU\Software\Valve\Steam -> SteamPath
    if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER).open_subkey(r"Software\Valve\Steam") {
        if let Ok(path_str) = key.get_value::<String, _>("SteamPath") {
            let p = PathBuf::from(path_str);
            if p.is_dir() {
                return Some(p);
            }
        }
    }

    // HKLM\SOFTWARE\WOW6432Node\Valve\Steam -> InstallPath
    if let Ok(key) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(r"SOFTWARE\WOW6432Node\Valve\Steam") {
        if let Ok(path_str) = key.get_value::<String, _>("InstallPath") {
            let p = PathBuf::from(path_str);
            if p.is_dir() {
                return Some(p);
            }
        }
    }

    // HKLM\SOFTWARE\Valve\Steam -> InstallPath
    if let Ok(key) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(r"SOFTWARE\Valve\Steam") {
        if let Ok(path_str) = key.get_value::<String, _>("InstallPath") {
            let p = PathBuf::from(path_str);
            if p.is_dir() {
                return Some(p);
            }
        }
    }

    None
}

/// Đọc file `libraryfolders.vdf` để lấy danh sách các thư viện Steam
fn parse_library_folders(vdf_path: &Path) -> Vec<PathBuf> {
    let mut folders = Vec::new();
    let Ok(content) = std::fs::read_to_string(vdf_path) else {
        return folders;
    };

    // Tìm dòng chứa `"path"\t\t"..."` hoặc `"path" "..."`
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("\"path\"") {
            let parts: Vec<&str> = trimmed.split('"').collect();
            // parts[0] = "", parts[1] = "path", parts[2] = spaces, parts[3] = path value
            if parts.len() >= 4 {
                let path_val = parts[3].replace(r"\\", r"\");
                let pb = PathBuf::from(path_val);
                if pb.is_dir() {
                    folders.push(pb);
                }
            }
        }
    }

    folders
}
