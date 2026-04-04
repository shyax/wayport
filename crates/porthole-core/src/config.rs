use std::path::PathBuf;

pub fn config_dir() -> PathBuf {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Porthole");
    std::fs::create_dir_all(&dir).ok();
    dir
}

pub fn db_path() -> PathBuf {
    config_dir().join("porthole.db")
}

pub fn auth_path() -> PathBuf {
    config_dir().join("auth.json")
}

pub fn tunnels_dir() -> PathBuf {
    let dir = config_dir().join("tunnels");
    std::fs::create_dir_all(&dir).ok();
    dir
}
