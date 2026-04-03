use std::path::PathBuf;
use parking_lot::Mutex;
use rusqlite::{Connection, params};
use chrono::Utc;
use uuid::Uuid;

use crate::types::{
    ConnectionProfile, Environment, Folder, ForwardingType, HistoryEntry, JumpHost, Workspace,
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const MIGRATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS workspaces (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'personal',
    is_local   INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id    TEXT REFERENCES folders(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS environments (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    variables    TEXT NOT NULL DEFAULT '{}',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    is_default   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connection_profiles (
    id               TEXT PRIMARY KEY,
    workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id        TEXT REFERENCES folders(id) ON DELETE SET NULL,
    name             TEXT NOT NULL,
    forwarding_type  TEXT NOT NULL DEFAULT 'local',
    ssh_user         TEXT NOT NULL,
    bastion_host     TEXT NOT NULL,
    bastion_port     INTEGER NOT NULL DEFAULT 22,
    identity_file    TEXT NOT NULL DEFAULT '',
    local_port       INTEGER NOT NULL,
    remote_host      TEXT,
    remote_port      INTEGER,
    auto_reconnect   INTEGER NOT NULL DEFAULT 1,
    jump_hosts       TEXT NOT NULL DEFAULT '[]',
    tags             TEXT NOT NULL DEFAULT '[]',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    version          INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connection_history (
    id                TEXT PRIMARY KEY,
    workspace_id      TEXT NOT NULL,
    profile_id        TEXT,
    profile_name      TEXT NOT NULL,
    user_display_name TEXT NOT NULL DEFAULT 'Local User',
    action            TEXT NOT NULL,
    details           TEXT,
    duration_secs     INTEGER,
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id  TEXT NOT NULL,
    operation  TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;

// ---------------------------------------------------------------------------
// Database struct
// ---------------------------------------------------------------------------

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the database at `db_path` and run migrations.
    pub fn new(db_path: PathBuf) -> Self {
        // Ensure parent directory exists.
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)
            .unwrap_or_else(|e| panic!("Failed to open database at {:?}: {}", db_path, e));

        // Enable WAL mode and foreign keys.
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .expect("Failed to set PRAGMAs");

        // Run schema migrations.
        conn.execute_batch(MIGRATIONS).expect("Failed to run migrations");

        let db = Self {
            conn: Mutex::new(conn),
        };

        // Seed default workspace.
        db.ensure_default_workspace();

        db
    }

    fn now() -> String {
        Utc::now().to_rfc3339()
    }

    #[allow(dead_code)]
    fn new_id() -> String {
        Uuid::new_v4().to_string()
    }

    // -----------------------------------------------------------------------
    // Default workspace
    // -----------------------------------------------------------------------

    fn ensure_default_workspace(&self) {
        let conn = self.conn.lock();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM workspaces WHERE id = 'local'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if count == 0 {
            let now = Self::now();
            conn.execute(
                "INSERT INTO workspaces (id, name, type, is_local, created_at, updated_at) \
                 VALUES ('local', 'My Workspace', 'personal', 1, ?1, ?2)",
                params![now, now],
            )
            .expect("Failed to insert default workspace");
        }
    }

    // -----------------------------------------------------------------------
    // Workspaces
    // -----------------------------------------------------------------------

    pub fn get_workspaces(&self) -> Vec<Workspace> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, name, type, is_local, created_at, updated_at FROM workspaces ORDER BY created_at",
            )
            .expect("prepare failed");

        stmt.query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                workspace_type: row.get(2)?,
                is_local: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .collect()
    }

    pub fn get_workspace(&self, id: &str) -> Option<Workspace> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, name, type, is_local, created_at, updated_at FROM workspaces WHERE id = ?1",
            params![id],
            |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    workspace_type: row.get(2)?,
                    is_local: row.get::<_, i32>(3)? != 0,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .ok()
    }

    // -----------------------------------------------------------------------
    // Folders
    // -----------------------------------------------------------------------

    pub fn get_folders(&self, workspace_id: &str) -> Vec<Folder> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, parent_id, name, sort_order, created_at, updated_at \
                 FROM folders WHERE workspace_id = ?1 ORDER BY sort_order, name",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id], |row| {
            Ok(Folder {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .collect()
    }

    pub fn create_folder(&self, folder: &Folder) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO folders (id, workspace_id, parent_id, name, sort_order, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                folder.id,
                folder.workspace_id,
                folder.parent_id,
                folder.name,
                folder.sort_order,
                folder.created_at,
                folder.updated_at,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn update_folder(&self, folder: &Folder) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE folders SET workspace_id=?1, parent_id=?2, name=?3, sort_order=?4, updated_at=?5 \
             WHERE id=?6",
            params![
                folder.workspace_id,
                folder.parent_id,
                folder.name,
                folder.sort_order,
                folder.updated_at,
                folder.id,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn delete_folder(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    // -----------------------------------------------------------------------
    // Environments
    // -----------------------------------------------------------------------

    pub fn get_environments(&self, workspace_id: &str) -> Vec<Environment> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, name, variables, sort_order, is_default, created_at, updated_at \
                 FROM environments WHERE workspace_id = ?1 ORDER BY sort_order, name",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id], |row| {
            let variables_json: String = row.get(3)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                variables_json,
                row.get::<_, i32>(4)?,
                row.get::<_, i32>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .map(|(id, ws_id, name, variables_json, sort_order, is_default, created_at, updated_at)| {
            let variables = serde_json::from_str(&variables_json).unwrap_or_default();
            Environment {
                id,
                workspace_id: ws_id,
                name,
                variables,
                sort_order,
                is_default: is_default != 0,
                created_at,
                updated_at,
            }
        })
        .collect()
    }

    pub fn create_environment(&self, env: &Environment) -> Result<(), String> {
        let variables_json =
            serde_json::to_string(&env.variables).map_err(|e| e.to_string())?;
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO environments (id, workspace_id, name, variables, sort_order, is_default, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                env.id,
                env.workspace_id,
                env.name,
                variables_json,
                env.sort_order,
                env.is_default as i32,
                env.created_at,
                env.updated_at,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn update_environment(&self, env: &Environment) -> Result<(), String> {
        let variables_json =
            serde_json::to_string(&env.variables).map_err(|e| e.to_string())?;
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE environments SET workspace_id=?1, name=?2, variables=?3, sort_order=?4, is_default=?5, updated_at=?6 \
             WHERE id=?7",
            params![
                env.workspace_id,
                env.name,
                variables_json,
                env.sort_order,
                env.is_default as i32,
                env.updated_at,
                env.id,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn delete_environment(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM environments WHERE id = ?1", params![id])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    // -----------------------------------------------------------------------
    // Connection profiles
    // -----------------------------------------------------------------------

    pub fn get_profiles(&self, workspace_id: &str) -> Vec<ConnectionProfile> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, folder_id, name, forwarding_type, ssh_user, \
                        bastion_host, bastion_port, identity_file, local_port, \
                        remote_host, remote_port, auto_reconnect, jump_hosts, tags, \
                        sort_order, version, created_at, updated_at \
                 FROM connection_profiles WHERE workspace_id = ?1 \
                 ORDER BY sort_order, name",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, u16>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, u16>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<u16>>(11)?,
                row.get::<_, i32>(12)?,
                row.get::<_, String>(13)?,
                row.get::<_, String>(14)?,
                row.get::<_, i32>(15)?,
                row.get::<_, i32>(16)?,
                row.get::<_, String>(17)?,
                row.get::<_, String>(18)?,
            ))
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .map(|t| profile_from_row(t))
        .collect()
    }

    pub fn get_profile(&self, id: &str) -> Option<ConnectionProfile> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, workspace_id, folder_id, name, forwarding_type, ssh_user, \
                    bastion_host, bastion_port, identity_file, local_port, \
                    remote_host, remote_port, auto_reconnect, jump_hosts, tags, \
                    sort_order, version, created_at, updated_at \
             FROM connection_profiles WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, u16>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, u16>(9)?,
                    row.get::<_, Option<String>>(10)?,
                    row.get::<_, Option<u16>>(11)?,
                    row.get::<_, i32>(12)?,
                    row.get::<_, String>(13)?,
                    row.get::<_, String>(14)?,
                    row.get::<_, i32>(15)?,
                    row.get::<_, i32>(16)?,
                    row.get::<_, String>(17)?,
                    row.get::<_, String>(18)?,
                ))
            },
        )
        .ok()
        .map(profile_from_row)
    }

    pub fn create_profile(&self, profile: &ConnectionProfile) -> Result<(), String> {
        let jump_hosts_json =
            serde_json::to_string(&profile.jump_hosts).map_err(|e| e.to_string())?;
        let tags_json = serde_json::to_string(&profile.tags).map_err(|e| e.to_string())?;
        let forwarding_type = forwarding_type_to_str(profile.forwarding_type);
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO connection_profiles \
             (id, workspace_id, folder_id, name, forwarding_type, ssh_user, \
              bastion_host, bastion_port, identity_file, local_port, \
              remote_host, remote_port, auto_reconnect, jump_hosts, tags, \
              sort_order, version, created_at, updated_at) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)",
            params![
                profile.id,
                profile.workspace_id,
                profile.folder_id,
                profile.name,
                forwarding_type,
                profile.ssh_user,
                profile.bastion_host,
                profile.bastion_port,
                profile.identity_file,
                profile.local_port,
                profile.remote_host,
                profile.remote_port,
                profile.auto_reconnect as i32,
                jump_hosts_json,
                tags_json,
                profile.sort_order,
                profile.version,
                profile.created_at,
                profile.updated_at,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn update_profile(&self, profile: &ConnectionProfile) -> Result<(), String> {
        let jump_hosts_json =
            serde_json::to_string(&profile.jump_hosts).map_err(|e| e.to_string())?;
        let tags_json = serde_json::to_string(&profile.tags).map_err(|e| e.to_string())?;
        let forwarding_type = forwarding_type_to_str(profile.forwarding_type);
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE connection_profiles SET \
             workspace_id=?1, folder_id=?2, name=?3, forwarding_type=?4, ssh_user=?5, \
             bastion_host=?6, bastion_port=?7, identity_file=?8, local_port=?9, \
             remote_host=?10, remote_port=?11, auto_reconnect=?12, jump_hosts=?13, \
             tags=?14, sort_order=?15, version=?16, updated_at=?17 \
             WHERE id=?18",
            params![
                profile.workspace_id,
                profile.folder_id,
                profile.name,
                forwarding_type,
                profile.ssh_user,
                profile.bastion_host,
                profile.bastion_port,
                profile.identity_file,
                profile.local_port,
                profile.remote_host,
                profile.remote_port,
                profile.auto_reconnect as i32,
                jump_hosts_json,
                tags_json,
                profile.sort_order,
                profile.version,
                profile.updated_at,
                profile.id,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn delete_profile(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM connection_profiles WHERE id = ?1", params![id])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    // -----------------------------------------------------------------------
    // History
    // -----------------------------------------------------------------------

    pub fn record_history(&self, entry: &HistoryEntry) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO connection_history \
             (id, workspace_id, profile_id, profile_name, user_display_name, action, details, duration_secs, created_at) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                entry.id,
                entry.workspace_id,
                entry.profile_id,
                entry.profile_name,
                entry.user_display_name,
                entry.action,
                entry.details,
                entry.duration_secs,
                entry.created_at,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn get_history(&self, workspace_id: &str, limit: u32) -> Vec<HistoryEntry> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, profile_id, profile_name, user_display_name, \
                        action, details, duration_secs, created_at \
                 FROM connection_history \
                 WHERE workspace_id = ?1 \
                 ORDER BY created_at DESC LIMIT ?2",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id, limit], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                profile_id: row.get(2)?,
                profile_name: row.get(3)?,
                user_display_name: row.get(4)?,
                action: row.get(5)?,
                details: row.get(6)?,
                duration_secs: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .collect()
    }

    // -----------------------------------------------------------------------
    // Preferences
    // -----------------------------------------------------------------------

    pub fn get_preference(&self, key: &str) -> Option<String> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT value FROM preferences WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .ok()
    }

    pub fn set_preference(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO preferences (key, value) VALUES (?1, ?2) \
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    // -----------------------------------------------------------------------
    // Bulk insert used during migration
    // -----------------------------------------------------------------------

    pub fn insert_profiles_if_absent(&self, profiles: &[ConnectionProfile]) {
        for profile in profiles {
            // Only insert if the id doesn't already exist.
            let exists: bool = {
                let conn = self.conn.lock();
                conn.query_row(
                    "SELECT COUNT(*) FROM connection_profiles WHERE id = ?1",
                    params![profile.id],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap_or(0)
                    > 0
            };
            if !exists {
                let _ = self.create_profile(profile);
            }
        }
    }

}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ProfileRow = (
    String,        // 0 id
    String,        // 1 workspace_id
    Option<String>,// 2 folder_id
    String,        // 3 name
    String,        // 4 forwarding_type
    String,        // 5 ssh_user
    String,        // 6 bastion_host
    u16,           // 7 bastion_port
    String,        // 8 identity_file
    u16,           // 9 local_port
    Option<String>,// 10 remote_host
    Option<u16>,   // 11 remote_port
    i32,           // 12 auto_reconnect
    String,        // 13 jump_hosts JSON
    String,        // 14 tags JSON
    i32,           // 15 sort_order
    i32,           // 16 version
    String,        // 17 created_at
    String,        // 18 updated_at
);

fn profile_from_row(t: ProfileRow) -> ConnectionProfile {
    let jump_hosts: Vec<JumpHost> = serde_json::from_str(&t.13).unwrap_or_default();
    let tags: Vec<String> = serde_json::from_str(&t.14).unwrap_or_default();
    ConnectionProfile {
        id: t.0,
        workspace_id: t.1,
        folder_id: t.2,
        name: t.3,
        forwarding_type: forwarding_type_from_str(&t.4),
        ssh_user: t.5,
        bastion_host: t.6,
        bastion_port: t.7,
        identity_file: t.8,
        local_port: t.9,
        remote_host: t.10,
        remote_port: t.11,
        auto_reconnect: t.12 != 0,
        jump_hosts,
        tags,
        sort_order: t.15,
        version: t.16,
        created_at: t.17,
        updated_at: t.18,
    }
}

fn forwarding_type_to_str(ft: ForwardingType) -> &'static str {
    match ft {
        ForwardingType::Local => "local",
        ForwardingType::Remote => "remote",
        ForwardingType::Dynamic => "dynamic",
    }
}

fn forwarding_type_from_str(s: &str) -> ForwardingType {
    match s {
        "remote" => ForwardingType::Remote,
        "dynamic" => ForwardingType::Dynamic,
        _ => ForwardingType::Local,
    }
}
