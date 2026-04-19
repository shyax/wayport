use crate::database::Database;
use crate::types::{ActionSource, HistoryEntry};
use chrono::Utc;
use uuid::Uuid;

#[allow(clippy::too_many_arguments)]
pub fn record_action(
    db: &Database,
    workspace_id: &str,
    profile_id: Option<&str>,
    profile_name: &str,
    action: &str,
    source: ActionSource,
    details: Option<String>,
    duration_secs: Option<i64>,
) -> Result<(), String> {
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        workspace_id: workspace_id.to_string(),
        profile_id: profile_id.map(|s| s.to_string()),
        profile_name: profile_name.to_string(),
        user_display_name: match source {
            ActionSource::Cli => "CLI".to_string(),
            ActionSource::Gui => "Desktop".to_string(),
            ActionSource::Api => "API".to_string(),
        },
        action: action.to_string(),
        details,
        duration_secs,
        created_at: Utc::now().to_rfc3339(),
        source,
    };

    db.record_history(&entry)
}
