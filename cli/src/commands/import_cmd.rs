use wayport_core::{config, config_file, database::Database};
use crate::output;

pub fn run(workspace: &str, file: &str) -> Result<(), String> {
    let path = std::path::Path::new(file);
    let imported_profiles = config_file::load_from_file(path)?;

    let db = Database::new(config::db_path());
    let existing = db.get_profiles(workspace);
    let mut count = 0;

    for mut profile in imported_profiles {
        if !existing.iter().any(|p| p.id == profile.id) {
            // Ensure the imported profile targets the correct workspace
            profile.workspace_id = workspace.to_string();
            db.create_profile(&profile)?;
            count += 1;
        }
    }

    output::success(&format!("Imported {} profile(s) from {}", count, file));
    Ok(())
}
