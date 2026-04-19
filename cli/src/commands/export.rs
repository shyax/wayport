use crate::output;
use chrono::Local;
use wayport_core::{
    config,
    config_file::{self, ConfigFormat},
    database::Database,
};

pub fn run(workspace: &str, output_path: Option<&str>, format: &str) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profiles = db.get_profiles(workspace);

    let cfg_format = match format.to_lowercase().as_str() {
        "yaml" | "yml" => ConfigFormat::Yaml,
        "toml" => ConfigFormat::Toml,
        _ => ConfigFormat::Json,
    };

    let path = output_path.map(|p| p.to_string()).unwrap_or_else(|| {
        format!(
            "wayport-export-{}.{}",
            Local::now().format("%Y%m%d-%H%M%S"),
            cfg_format.extension()
        )
    });

    config_file::save_to_file(&profiles, std::path::Path::new(&path), cfg_format)?;

    output::success(&format!(
        "Exported {} profile(s) to {}",
        profiles.len(),
        path
    ));
    Ok(())
}
