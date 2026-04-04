use porthole_core::{config, database::Database, types::ConnectionProfile};
use crate::output;

pub fn run(workspace: &str, file: &str) -> Result<(), String> {
    let content = std::fs::read_to_string(file)
        .map_err(|e| format!("Failed to read {}: {}", file, e))?;

    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let imported_profiles: Vec<ConnectionProfile> = serde_json::from_value(
        data["profiles"].clone()
    ).map_err(|e| format!("Invalid profiles format: {}", e))?;

    let db = Database::new(config::db_path());
    let existing = db.get_profiles(workspace);
    let mut count = 0;

    for profile in imported_profiles {
        if !existing.iter().any(|p| p.id == profile.id) {
            db.create_profile(&profile)?;
            count += 1;
        }
    }

    output::success(&format!("Imported {} profile(s) from {}", count, file));
    Ok(())
}
