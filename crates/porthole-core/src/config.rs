use std::path::PathBuf;

/// Returns the primary database path, preferring the Tauri desktop app's
/// data directory so the CLI and desktop app share the same database.
pub fn db_path() -> PathBuf {
    // Tauri stores app data in ~/Library/Application Support/<identifier> on macOS
    let tauri_path = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.shyax.porthole")
        .join("porthole.db");

    if tauri_path.exists() {
        return tauri_path;
    }

    // Fallback: our own config dir (used when desktop app has never run)
    config_dir().join("porthole.db")
}

pub fn config_dir() -> PathBuf {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Porthole");
    std::fs::create_dir_all(&dir).ok();
    dir
}

pub fn tunnels_dir() -> PathBuf {
    let dir = config_dir().join("tunnels");
    std::fs::create_dir_all(&dir).ok();
    dir
}
