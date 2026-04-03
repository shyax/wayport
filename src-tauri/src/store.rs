use crate::types::{ConnectionProfile, StoreConfig};
use std::path::PathBuf;
use std::fs;
use serde_json;

pub struct Store {
    config_path: PathBuf,
}

impl Store {
    pub fn new(config_dir: PathBuf) -> Self {
        fs::create_dir_all(&config_dir).ok();
        Self {
            config_path: config_dir.join("config.json"),
        }
    }

    pub fn load(&self) -> StoreConfig {
        match fs::read_to_string(&self.config_path) {
            Ok(content) => {
                serde_json::from_str(&content).unwrap_or_default()
            }
            Err(_) => StoreConfig::default(),
        }
    }

    pub fn save(&self, config: &StoreConfig) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(config)?;
        fs::write(&self.config_path, content)?;
        Ok(())
    }

    pub fn get_profiles(&self) -> Vec<ConnectionProfile> {
        self.load().profiles
    }

    pub fn save_profiles(&self, profiles: Vec<ConnectionProfile>) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.load();
        config.profiles = profiles;
        self.save(&config)
    }
}
