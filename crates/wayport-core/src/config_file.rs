use crate::types::ConnectionProfile;
use std::path::Path;

#[derive(Debug, Clone, Copy)]
pub enum ConfigFormat {
    Json,
    Yaml,
    Toml,
}

impl ConfigFormat {
    pub fn from_extension(path: &Path) -> Self {
        match path.extension().and_then(|e| e.to_str()) {
            Some("yml") | Some("yaml") => ConfigFormat::Yaml,
            Some("toml") => ConfigFormat::Toml,
            _ => ConfigFormat::Json,
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            ConfigFormat::Json => "json",
            ConfigFormat::Yaml => "yml",
            ConfigFormat::Toml => "toml",
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ConfigFile {
    #[serde(default)]
    pub version: u32,
    #[serde(default)]
    pub profiles: Vec<ConnectionProfile>,
}

pub fn load_from_file(path: &Path) -> Result<Vec<ConnectionProfile>, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let format = ConfigFormat::from_extension(path);
    let config: ConfigFile = match format {
        ConfigFormat::Json => serde_json::from_str(&content).map_err(|e| e.to_string())?,
        ConfigFormat::Yaml => serde_yaml::from_str(&content).map_err(|e| e.to_string())?,
        ConfigFormat::Toml => toml::from_str(&content).map_err(|e| e.to_string())?,
    };

    Ok(config.profiles)
}

pub fn save_to_file(profiles: &[ConnectionProfile], path: &Path, format: ConfigFormat) -> Result<(), String> {
    let config = ConfigFile {
        version: 1,
        profiles: profiles.to_vec(),
    };

    let content = match format {
        ConfigFormat::Json => serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?,
        ConfigFormat::Yaml => serde_yaml::to_string(&config).map_err(|e| e.to_string())?,
        ConfigFormat::Toml => toml::to_string_pretty(&config).map_err(|e| e.to_string())?,
    };

    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}
