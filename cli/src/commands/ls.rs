use comfy_table::Cell;
use wayport_core::{config, database::Database};
use crate::output;

pub fn run(workspace: &str, tag: Option<&str>, json: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let profiles = db.get_profiles(workspace);

    let profiles: Vec<_> = if let Some(tag) = tag {
        let t = tag.to_lowercase();
        profiles.into_iter().filter(|p| p.tags.iter().any(|pt| pt.to_lowercase() == t)).collect()
    } else {
        profiles
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&profiles).unwrap_or_default());
        return Ok(());
    }

    if profiles.is_empty() {
        println!("No profiles found. Use \x1b[33mwayport import-ssh\x1b[0m to import from ~/.ssh/config.");
        return Ok(());
    }

    let mut table = output::table(&["Name", "Type", "Local", "Remote", "Tags"]);
    for p in &profiles {
        let flag = match p.forwarding_type {
            wayport_core::types::ForwardingType::Local => "-L",
            wayport_core::types::ForwardingType::Remote => "-R",
            wayport_core::types::ForwardingType::Dynamic => "-D",
            wayport_core::types::ForwardingType::Kubernetes => "K8s",
        };
        let remote = match (&p.remote_host, p.remote_port) {
            (Some(h), Some(port)) => format!("{}:{}", h, port),
            _ => "-".to_string(),
        };
        let tags = if p.tags.is_empty() { "-".to_string() } else { p.tags.join(", ") };

        table.add_row(vec![
            Cell::new(&p.name),
            Cell::new(flag),
            Cell::new(p.local_port),
            Cell::new(&remote),
            Cell::new(&tags),
        ]);
    }

    println!("{table}");
    Ok(())
}
