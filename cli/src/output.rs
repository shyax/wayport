use comfy_table::{Cell, Color, ContentArrangement, Table};

pub fn table(headers: &[&str]) -> Table {
    let mut table = Table::new();
    table.set_content_arrangement(ContentArrangement::Dynamic);
    table.load_preset("                   ");
    table.set_header(
        headers
            .iter()
            .map(|h| Cell::new(h.to_uppercase()).fg(Color::DarkGrey)),
    );
    table
}

pub fn success(msg: &str) {
    println!("\x1b[32m✓\x1b[0m {}", msg);
}

pub fn info(msg: &str) {
    println!("  {}", msg);
}

pub fn format_uptime(connected_since: &str) -> String {
    let Ok(dt) = chrono::DateTime::parse_from_rfc3339(connected_since) else {
        return "-".to_string();
    };
    let dur = chrono::Utc::now().signed_duration_since(dt);
    let hours = dur.num_hours();
    let mins = dur.num_minutes() % 60;
    if hours > 0 {
        format!("{}h {}m", hours, mins)
    } else {
        format!("{}m", mins)
    }
}
