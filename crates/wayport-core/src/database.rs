use std::path::PathBuf;
use parking_lot::Mutex;
use rusqlite::{Connection, params};
use chrono::Utc;
use uuid::Uuid;

use crate::types::{
    ActionSource, ConnectionProfile, Environment, Folder, ForwardingType, HistoryEntry, JumpHost,
    TunnelGroup, Workspace,
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

        // Enable WAL mode, busy timeout, and foreign keys.
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
        )
        .expect("Failed to set PRAGMAs");

        // Run schema migrations.
        conn.execute_batch(MIGRATIONS).expect("Failed to run migrations");

        // Add source column to connection_history if missing (migration for existing DBs).
        let has_source: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('connection_history') WHERE name='source'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if !has_source {
            conn.execute_batch(
                "ALTER TABLE connection_history ADD COLUMN source TEXT NOT NULL DEFAULT 'gui'",
            )
            .expect("Failed to add source column");
        }

        // Add k8s columns to connection_profiles if missing.
        let has_k8s: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('connection_profiles') WHERE name='k8s_context'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if !has_k8s {
            conn.execute_batch(
                "ALTER TABLE connection_profiles ADD COLUMN k8s_context TEXT;
                 ALTER TABLE connection_profiles ADD COLUMN k8s_namespace TEXT;
                 ALTER TABLE connection_profiles ADD COLUMN k8s_resource TEXT;
                 ALTER TABLE connection_profiles ADD COLUMN k8s_resource_port INTEGER;"
            ).expect("Failed to add k8s columns");
        }

        // Create tunnel_groups table if missing (migration for existing DBs).
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS tunnel_groups (
                id           TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                name         TEXT NOT NULL,
                profile_ids  TEXT NOT NULL DEFAULT '[]',
                sort_order   INTEGER NOT NULL DEFAULT 0,
                created_at   TEXT NOT NULL,
                updated_at   TEXT NOT NULL
            )"
        ).expect("Failed to create tunnel_groups table");

        // Add is_pinned column to connection_profiles if missing.
        let has_pinned: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('connection_profiles') WHERE name='is_pinned'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if !has_pinned {
            conn.execute_batch(
                "ALTER TABLE connection_profiles ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0"
            ).expect("Failed to add is_pinned column");
        }

        // Add color column to environments if missing.
        let has_color: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('environments') WHERE name='color'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0;

        if !has_color {
            conn.execute_batch(
                "ALTER TABLE environments ADD COLUMN color TEXT"
            ).expect("Failed to add color column");
        }

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
                "SELECT id, workspace_id, name, variables, sort_order, is_default, created_at, updated_at, color \
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
                row.get::<_, Option<String>>(8)?,
            ))
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .map(|(id, ws_id, name, variables_json, sort_order, is_default, created_at, updated_at, color)| {
            let variables = serde_json::from_str(&variables_json).unwrap_or_default();
            Environment {
                id,
                workspace_id: ws_id,
                name,
                variables,
                color,
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
            "INSERT INTO environments (id, workspace_id, name, variables, sort_order, is_default, created_at, updated_at, color) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                env.id,
                env.workspace_id,
                env.name,
                variables_json,
                env.sort_order,
                env.is_default as i32,
                env.created_at,
                env.updated_at,
                env.color,
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
            "UPDATE environments SET workspace_id=?1, name=?2, variables=?3, sort_order=?4, is_default=?5, updated_at=?6, color=?7 \
             WHERE id=?8",
            params![
                env.workspace_id,
                env.name,
                variables_json,
                env.sort_order,
                env.is_default as i32,
                env.updated_at,
                env.color,
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
                        sort_order, version, created_at, updated_at, \
                        k8s_context, k8s_namespace, k8s_resource, k8s_resource_port, \
                        COALESCE(is_pinned, 0) as is_pinned \
                 FROM connection_profiles WHERE workspace_id = ?1 \
                 ORDER BY sort_order, name",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id], read_profile_row)
            .expect("query failed")
            .filter_map(|r| r.ok())
            .collect()
    }

    pub fn get_profile(&self, id: &str) -> Option<ConnectionProfile> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, workspace_id, folder_id, name, forwarding_type, ssh_user, \
                    bastion_host, bastion_port, identity_file, local_port, \
                    remote_host, remote_port, auto_reconnect, jump_hosts, tags, \
                    sort_order, version, created_at, updated_at, \
                    k8s_context, k8s_namespace, k8s_resource, k8s_resource_port \
             FROM connection_profiles WHERE id = ?1",
            params![id],
            read_profile_row,
        )
        .ok()
    }

    pub fn get_profile_by_name(&self, workspace_id: &str, name: &str) -> Option<ConnectionProfile> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, workspace_id, folder_id, name, forwarding_type, ssh_user, \
                    bastion_host, bastion_port, identity_file, local_port, \
                    remote_host, remote_port, auto_reconnect, jump_hosts, tags, \
                    sort_order, version, created_at, updated_at, \
                    k8s_context, k8s_namespace, k8s_resource, k8s_resource_port \
             FROM connection_profiles WHERE workspace_id = ?1 AND name = ?2 LIMIT 1",
            params![workspace_id, name],
            read_profile_row,
        )
        .ok()
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
              sort_order, version, created_at, updated_at, \
              k8s_context, k8s_namespace, k8s_resource, k8s_resource_port, is_pinned) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)",
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
                profile.k8s_context,
                profile.k8s_namespace,
                profile.k8s_resource,
                profile.k8s_resource_port,
                profile.is_pinned as i32,
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
             tags=?14, sort_order=?15, version=?16, updated_at=?17, \
             k8s_context=?18, k8s_namespace=?19, k8s_resource=?20, k8s_resource_port=?21, \
             is_pinned=?22 \
             WHERE id=?23",
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
                profile.k8s_context,
                profile.k8s_namespace,
                profile.k8s_resource,
                profile.k8s_resource_port,
                profile.is_pinned as i32,
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

    pub fn set_profile_pinned(&self, id: &str, pinned: bool) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE connection_profiles SET is_pinned = ?1 WHERE id = ?2",
            params![pinned as i32, id],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn get_recent_profile_ids(&self, workspace_id: &str, limit: usize) -> Vec<String> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT DISTINCT profile_id FROM connection_history \
                 WHERE workspace_id = ?1 AND action = 'connect' AND profile_id IS NOT NULL \
                 ORDER BY created_at DESC LIMIT ?2",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id, limit as i64], |row| {
            row.get::<_, String>(0)
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .collect()
    }

    // -----------------------------------------------------------------------
    // History
    // -----------------------------------------------------------------------

    pub fn record_history(&self, entry: &HistoryEntry) -> Result<(), String> {
        let source = entry.source.to_string();
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO connection_history \
             (id, workspace_id, profile_id, profile_name, user_display_name, action, details, duration_secs, created_at, source) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
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
                source,
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
                        action, details, duration_secs, created_at, \
                        COALESCE(source, 'gui') \
                 FROM connection_history \
                 WHERE workspace_id = ?1 \
                 ORDER BY created_at DESC LIMIT ?2",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id, limit], |row| {
            let source_str: String = row.get(9)?;
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
                source: action_source_from_str(&source_str),
            })
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .collect()
    }

    // -----------------------------------------------------------------------
    // Tunnel Groups
    // -----------------------------------------------------------------------

    pub fn get_groups(&self, workspace_id: &str) -> Vec<TunnelGroup> {
        let conn = self.conn.lock();
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, name, profile_ids, sort_order, created_at, updated_at \
                 FROM tunnel_groups WHERE workspace_id = ?1 ORDER BY sort_order, name",
            )
            .expect("prepare failed");

        stmt.query_map(params![workspace_id], |row| {
            let profile_ids_json: String = row.get(3)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                profile_ids_json,
                row.get::<_, i32>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .expect("query failed")
        .filter_map(|r| r.ok())
        .map(|(id, ws_id, name, profile_ids_json, sort_order, created_at, updated_at)| {
            let profile_ids: Vec<String> = serde_json::from_str(&profile_ids_json).unwrap_or_default();
            TunnelGroup {
                id,
                workspace_id: ws_id,
                name,
                profile_ids,
                sort_order,
                created_at,
                updated_at,
            }
        })
        .collect()
    }

    pub fn create_group(&self, group: &TunnelGroup) -> Result<(), String> {
        let profile_ids_json = serde_json::to_string(&group.profile_ids).map_err(|e| e.to_string())?;
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO tunnel_groups (id, workspace_id, name, profile_ids, sort_order, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                group.id,
                group.workspace_id,
                group.name,
                profile_ids_json,
                group.sort_order,
                group.created_at,
                group.updated_at,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn update_group(&self, group: &TunnelGroup) -> Result<(), String> {
        let profile_ids_json = serde_json::to_string(&group.profile_ids).map_err(|e| e.to_string())?;
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tunnel_groups SET workspace_id=?1, name=?2, profile_ids=?3, sort_order=?4, updated_at=?5 \
             WHERE id=?6",
            params![
                group.workspace_id,
                group.name,
                profile_ids_json,
                group.sort_order,
                group.updated_at,
                group.id,
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    }

    pub fn delete_group(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM tunnel_groups WHERE id = ?1", params![id])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn get_group_by_name(&self, workspace_id: &str, name: &str) -> Option<TunnelGroup> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, workspace_id, name, profile_ids, sort_order, created_at, updated_at \
             FROM tunnel_groups WHERE workspace_id = ?1 AND name = ?2 LIMIT 1",
            params![workspace_id, name],
            |row| {
                let profile_ids_json: String = row.get(3)?;
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    profile_ids_json,
                    row.get::<_, i32>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .ok()
        .map(|(id, ws_id, name, profile_ids_json, sort_order, created_at, updated_at)| {
            let profile_ids: Vec<String> = serde_json::from_str(&profile_ids_json).unwrap_or_default();
            TunnelGroup {
                id,
                workspace_id: ws_id,
                name,
                profile_ids,
                sort_order,
                created_at,
                updated_at,
            }
        })
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

fn read_profile_row(row: &rusqlite::Row) -> rusqlite::Result<ConnectionProfile> {
    let jump_hosts_json: String = row.get(13)?;
    let tags_json: String = row.get(14)?;
    let ft_str: String = row.get(4)?;
    let jump_hosts: Vec<JumpHost> = serde_json::from_str(&jump_hosts_json).unwrap_or_default();
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    Ok(ConnectionProfile {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        folder_id: row.get(2)?,
        name: row.get(3)?,
        forwarding_type: forwarding_type_from_str(&ft_str),
        ssh_user: row.get(5)?,
        bastion_host: row.get(6)?,
        bastion_port: row.get(7)?,
        identity_file: row.get(8)?,
        local_port: row.get(9)?,
        remote_host: row.get(10)?,
        remote_port: row.get(11)?,
        auto_reconnect: row.get::<_, i32>(12)? != 0,
        jump_hosts,
        tags,
        sort_order: row.get(15)?,
        version: row.get(16)?,
        created_at: row.get(17)?,
        updated_at: row.get(18)?,
        k8s_context: row.get(19)?,
        k8s_namespace: row.get(20)?,
        k8s_resource: row.get(21)?,
        k8s_resource_port: row.get(22)?,
        is_pinned: row.get::<_, i32>(23).unwrap_or(0) != 0,
    })
}

fn forwarding_type_to_str(ft: ForwardingType) -> &'static str {
    match ft {
        ForwardingType::Local => "local",
        ForwardingType::Remote => "remote",
        ForwardingType::Dynamic => "dynamic",
        ForwardingType::Kubernetes => "kubernetes",
    }
}

fn forwarding_type_from_str(s: &str) -> ForwardingType {
    match s {
        "remote" => ForwardingType::Remote,
        "dynamic" => ForwardingType::Dynamic,
        "kubernetes" => ForwardingType::Kubernetes,
        _ => ForwardingType::Local,
    }
}

fn action_source_from_str(s: &str) -> ActionSource {
    match s {
        "cli" => ActionSource::Cli,
        "api" => ActionSource::Api,
        _ => ActionSource::Gui,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn test_db() -> (Database, TempDir) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.db");
        let db = Database::new(path);
        (db, dir)
    }

    fn sample_profile(name: &str) -> ConnectionProfile {
        let now = Database::now();
        ConnectionProfile {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            forwarding_type: ForwardingType::Local,
            ssh_user: "root".to_string(),
            bastion_host: "example.com".to_string(),
            bastion_port: 22,
            identity_file: String::new(),
            local_port: 8080,
            remote_host: Some("localhost".to_string()),
            remote_port: Some(5432),
            auto_reconnect: true,
            jump_hosts: vec![],
            tags: vec!["test".to_string()],
            created_at: now.clone(),
            updated_at: now,
            workspace_id: "local".to_string(),
            folder_id: None,
            sort_order: 0,
            is_pinned: false,
            version: 1,
            k8s_context: None,
            k8s_namespace: None,
            k8s_resource: None,
            k8s_resource_port: None,
        }
    }

    #[test]
    fn creates_default_workspace() {
        let (db, _dir) = test_db();
        let workspaces = db.get_workspaces();
        assert_eq!(workspaces.len(), 1);
        assert_eq!(workspaces[0].id, "local");
        assert_eq!(workspaces[0].name, "My Workspace");
    }

    #[test]
    fn profile_crud() {
        let (db, _dir) = test_db();
        let profile = sample_profile("test-tunnel");

        // Create
        db.create_profile(&profile).unwrap();
        let fetched = db.get_profile(&profile.id).unwrap();
        assert_eq!(fetched.name, "test-tunnel");
        assert_eq!(fetched.bastion_host, "example.com");
        assert_eq!(fetched.tags, vec!["test".to_string()]);

        // Update
        let mut updated = fetched;
        updated.name = "renamed-tunnel".to_string();
        updated.bastion_port = 2222;
        db.update_profile(&updated).unwrap();
        let fetched = db.get_profile(&profile.id).unwrap();
        assert_eq!(fetched.name, "renamed-tunnel");
        assert_eq!(fetched.bastion_port, 2222);

        // Delete
        db.delete_profile(&profile.id).unwrap();
        assert!(db.get_profile(&profile.id).is_none());
    }

    #[test]
    fn get_profiles_returns_all_in_workspace() {
        let (db, _dir) = test_db();
        db.create_profile(&sample_profile("tunnel-a")).unwrap();
        db.create_profile(&sample_profile("tunnel-b")).unwrap();

        let profiles = db.get_profiles("local");
        assert_eq!(profiles.len(), 2);
    }

    #[test]
    fn get_profile_by_name() {
        let (db, _dir) = test_db();
        db.create_profile(&sample_profile("my-tunnel")).unwrap();

        let found = db.get_profile_by_name("local", "my-tunnel");
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "my-tunnel");

        let not_found = db.get_profile_by_name("local", "nonexistent");
        assert!(not_found.is_none());
    }

    #[test]
    fn folder_crud() {
        let (db, _dir) = test_db();
        let now = Database::now();
        let folder = Folder {
            id: Uuid::new_v4().to_string(),
            workspace_id: "local".to_string(),
            parent_id: None,
            name: "Production".to_string(),
            sort_order: 0,
            created_at: now.clone(),
            updated_at: now,
        };

        db.create_folder(&folder).unwrap();
        let folders = db.get_folders("local");
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].name, "Production");

        let mut updated = folder.clone();
        updated.name = "Staging".to_string();
        db.update_folder(&updated).unwrap();
        let folders = db.get_folders("local");
        assert_eq!(folders[0].name, "Staging");

        db.delete_folder(&folder.id).unwrap();
        let folders = db.get_folders("local");
        assert!(folders.is_empty());
    }

    #[test]
    fn environment_crud() {
        let (db, _dir) = test_db();
        let now = Database::now();
        let mut variables = std::collections::HashMap::new();
        variables.insert("HOST".to_string(), "prod.example.com".to_string());

        let env = Environment {
            id: Uuid::new_v4().to_string(),
            workspace_id: "local".to_string(),
            name: "Production".to_string(),
            variables: variables.clone(),
            color: Some("#ef4444".to_string()),
            sort_order: 0,
            is_default: false,
            created_at: now.clone(),
            updated_at: now,
        };

        db.create_environment(&env).unwrap();
        let envs = db.get_environments("local");
        assert_eq!(envs.len(), 1);
        assert_eq!(envs[0].name, "Production");
        assert_eq!(envs[0].variables.get("HOST").unwrap(), "prod.example.com");

        db.delete_environment(&env.id).unwrap();
        assert!(db.get_environments("local").is_empty());
    }

    #[test]
    fn history_recording_and_retrieval() {
        let (db, _dir) = test_db();
        let now = Database::now();
        let entry = HistoryEntry {
            id: Uuid::new_v4().to_string(),
            workspace_id: "local".to_string(),
            profile_id: Some("prof-1".to_string()),
            profile_name: "test-tunnel".to_string(),
            user_display_name: "Local User".to_string(),
            action: "connected".to_string(),
            details: Some("Port 8080".to_string()),
            duration_secs: Some(120),
            created_at: now,
            source: ActionSource::Cli,
        };

        db.record_history(&entry).unwrap();
        let history = db.get_history("local", 10);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].profile_name, "test-tunnel");
        assert_eq!(history[0].source, ActionSource::Cli);
    }

    #[test]
    fn preferences_get_set() {
        let (db, _dir) = test_db();

        assert!(db.get_preference("theme").is_none());

        db.set_preference("theme", "dark").unwrap();
        assert_eq!(db.get_preference("theme").unwrap(), "dark");

        db.set_preference("theme", "light").unwrap();
        assert_eq!(db.get_preference("theme").unwrap(), "light");
    }

    #[test]
    fn insert_profiles_if_absent_skips_duplicates() {
        let (db, _dir) = test_db();
        let profile = sample_profile("unique-tunnel");

        db.insert_profiles_if_absent(&[profile.clone()]);
        db.insert_profiles_if_absent(&[profile.clone()]);

        let profiles = db.get_profiles("local");
        assert_eq!(profiles.len(), 1);
    }
}
