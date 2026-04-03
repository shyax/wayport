use std::path::PathBuf;
use crate::database::Database;
use crate::types::{ConnectionProfile, StoreConfig};

pub struct Store {
    db: Database,
    config_dir: PathBuf,
}

impl Store {
    pub fn new(config_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&config_dir).ok();
        let db_path = config_dir.join("porthole.db");
        let db = Database::new(db_path);
        let store = Self { db, config_dir: config_dir.clone() };
        store.migrate_from_json();
        store
    }

    /// If `config.json` exists, read profiles from it, insert them into SQLite,
    /// then rename the file to `config.json.bak` so it is not re-processed.
    fn migrate_from_json(&self) {
        let json_path = self.config_dir.join("config.json");
        if !json_path.exists() {
            return;
        }

        let content = match std::fs::read_to_string(&json_path) {
            Ok(c) => c,
            Err(_) => return,
        };

        let config: StoreConfig = match serde_json::from_str(&content) {
            Ok(c) => c,
            Err(_) => return,
        };

        if !config.profiles.is_empty() {
            // Ensure workspace_id is set on each profile.
            let profiles: Vec<ConnectionProfile> = config
                .profiles
                .into_iter()
                .map(|mut p| {
                    if p.workspace_id.is_empty() {
                        p.workspace_id = "local".to_string();
                    }
                    p
                })
                .collect();

            self.db.insert_profiles_if_absent(&profiles);
        }

        // Rename the old file so migration only runs once.
        let bak_path = self.config_dir.join("config.json.bak");
        std::fs::rename(&json_path, &bak_path).ok();
    }

    // -----------------------------------------------------------------------
    // Legacy public API (kept for all existing commands)
    // -----------------------------------------------------------------------

    pub fn get_profiles(&self) -> Vec<ConnectionProfile> {
        self.db.get_profiles("local")
    }

    pub fn save_profiles(&self, profiles: Vec<ConnectionProfile>) -> Result<(), Box<dyn std::error::Error>> {
        // Compute current DB ids so we can detect deletions.
        let existing_ids: std::collections::HashSet<String> = self
            .db
            .get_profiles("local")
            .into_iter()
            .map(|p| p.id.clone())
            .collect();

        let new_ids: std::collections::HashSet<String> = profiles
            .iter()
            .map(|p| p.id.clone())
            .collect();

        // Delete profiles that are no longer in the list.
        for id in existing_ids.difference(&new_ids) {
            self.db.delete_profile(id).map_err(|e| {
                Box::<dyn std::error::Error>::from(e)
            })?;
        }

        // Upsert every profile in the new list.
        for profile in &profiles {
            if new_ids.contains(&profile.id) && !existing_ids.contains(&profile.id) {
                // Brand new profile.
                self.db.create_profile(profile).map_err(|e| {
                    Box::<dyn std::error::Error>::from(e)
                })?;
            } else {
                // Existing profile — update it.
                self.db.update_profile(profile).map_err(|e| {
                    Box::<dyn std::error::Error>::from(e)
                })?;
            }
        }

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Access to the underlying Database for new commands
    // -----------------------------------------------------------------------

    pub fn database(&self) -> &Database {
        &self.db
    }
}
