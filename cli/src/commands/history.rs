use comfy_table::Cell;
use porthole_core::{config, database::Database};
use crate::output;

pub fn run(workspace: &str, limit: u32, source: Option<&str>, json: bool) -> Result<(), String> {
    let db = Database::new(config::db_path());
    let entries = db.get_history(workspace, limit);

    let entries: Vec<_> = if let Some(src) = source {
        let s = src.to_lowercase();
        entries.into_iter().filter(|e| e.source.to_string() == s).collect()
    } else {
        entries
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&entries).unwrap_or_default());
        return Ok(());
    }

    if entries.is_empty() {
        println!("No history entries");
        return Ok(());
    }

    let mut table = output::table(&["Time", "Profile", "Action", "Source", "Details"]);
    for e in &entries {
        let time = if e.created_at.len() >= 16 {
            &e.created_at[..16]
        } else {
            &e.created_at
        };
        table.add_row(vec![
            Cell::new(time.replace('T', " ")),
            Cell::new(&e.profile_name),
            Cell::new(&e.action),
            Cell::new(e.source.to_string()),
            Cell::new(e.details.as_deref().unwrap_or("-")),
        ]);
    }

    println!("{table}");
    Ok(())
}
