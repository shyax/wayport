use crate::output;
use chrono::Utc;
use wayport_core::{config, database::Database, history, ssh_config, types::ActionSource};

pub fn run() -> Result<(), String> {
    let profiles = ssh_config::parse_ssh_config()?;

    if profiles.is_empty() {
        println!("No hosts found in ~/.ssh/config");
        return Ok(());
    }

    println!("Found {} host(s) in ~/.ssh/config:\n", profiles.len());
    for p in &profiles {
        println!(
            "  {}  →  {}@{}:{}",
            p.name, p.ssh_user, p.bastion_host, p.bastion_port
        );
    }
    println!();

    let db = Database::new(config::db_path());
    let existing = db.get_profiles("local");
    let mut imported = 0;

    for mut p in profiles {
        // Skip if profile with same name already exists
        if existing.iter().any(|e| e.name == p.name) {
            continue;
        }
        p.id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        p.created_at = now.clone();
        p.updated_at = now;
        db.create_profile(&p)?;
        imported += 1;
    }

    if imported > 0 {
        history::record_action(
            &db,
            "local",
            None,
            "SSH Config",
            "import",
            ActionSource::Cli,
            Some(format!("Imported {} profile(s)", imported)),
            None,
        )
        .ok();
    }

    output::success(&format!("Imported {} profile(s)", imported));
    if imported < existing.len() + imported {
        output::info("(skipped profiles with duplicate names)");
    }
    Ok(())
}
