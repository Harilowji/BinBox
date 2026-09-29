pub mod detector;
pub mod parser;
pub mod watcher;

pub use parser::WeWallpaperInfo;
pub use watcher::*;

#[cfg(test)]
mod tests {
    use super::detector::*;
    use super::parser::*;

    #[test]
    fn test_detect_we_dir_if_present() {
        if let Some(we_dir) = detect_we_dir() {
            println!("Detected Wallpaper Engine dir: {}", we_dir.display());
            assert!(is_valid_we_dir(&we_dir));
            if let Some(cfg) = get_config_file(&we_dir) {
                println!("Found config.json at: {}", cfg.display());
                assert!(cfg.is_file());
            }
        }
    }
}
