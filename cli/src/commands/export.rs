use porthole_core::{config, database::Database};
use chrono::Local;
use crate::output;

pub fn run(workspace: &str, output_path: Option<&str>) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profiles = db.get_profiles(workspace);

    let export_data = serde_json::json!({
        "version": 1,
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "profiles": profiles,
    });

    let path = output_path
        .map(|p| p.to_string())
        .unwrap_or_else(|| {
            format!("porthole-export-{}.json", Local::now().format("%Y%m%d-%H%M%S"))
        });

    std::fs::write(&path, serde_json::to_string_pretty(&export_data).unwrap_or_default())
        .map_err(|e| format!("Failed to write: {}", e))?;

    output::success(&format!("Exported {} profile(s) to {}", profiles.len(), path));
    Ok(())
}
