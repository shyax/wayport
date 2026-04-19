mod commands;
mod output;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "wayport",
    about = "SSH tunnel manager — save, connect, and monitor port forwarding tunnels",
    version
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Output as JSON instead of table
    #[arg(long, global = true)]
    json: bool,

    /// Workspace to operate in
    #[arg(long, global = true, default_value = "local")]
    workspace: String,
}

#[derive(Subcommand)]
enum Commands {
    /// List saved connection profiles
    Ls {
        /// Filter by tag
        #[arg(long)]
        tag: Option<String>,
    },

    /// Connect to a saved tunnel profile
    Connect {
        /// Profile name
        name: String,

        /// Run in background (detached)
        #[arg(short, long)]
        detach: bool,
    },

    /// Disconnect an active tunnel
    Disconnect {
        /// Profile name
        name: String,
    },

    /// Show all active tunnels
    Status {
        /// Show uptime column
        #[arg(short, long)]
        verbose: bool,
    },

    /// Scan a port for running processes
    Scan {
        /// Port number or range (e.g. 3000 or 3000-3010)
        port: String,
    },

    /// Kill processes on a port
    Kill {
        /// Port number
        port: u16,
    },

    /// Show connection history (audit trail)
    History {
        /// Max entries to show
        #[arg(long, default_value = "20")]
        limit: u32,

        /// Filter by source (cli, gui)
        #[arg(long)]
        source: Option<String>,
    },

    /// Show SSH logs for a tunnel
    Logs {
        /// Profile name
        name: String,
    },

    /// Import hosts from ~/.ssh/config
    ImportSsh,

    /// Export profiles to a config file (JSON, YAML, or TOML)
    Export {
        /// Output file path
        #[arg(short, long)]
        output: Option<String>,

        /// Output format: json, yaml, toml (default: json)
        #[arg(short, long, default_value = "json")]
        format: String,
    },

    /// Import profiles from a config file (JSON, YAML, or TOML — auto-detected by extension)
    Import {
        /// Config file path (.json, .yml, .yaml, or .toml)
        file: String,
    },

    /// Manage tunnel groups (batch connect/disconnect)
    Group {
        #[command(subcommand)]
        action: GroupAction,
    },
}

#[derive(Subcommand)]
enum GroupAction {
    /// List all tunnel groups
    Ls,
    /// Create a new tunnel group
    Create {
        /// Group name
        name: String,
        /// Profile names to include
        profiles: Vec<String>,
    },
    /// Delete a tunnel group
    Delete {
        /// Group name
        name: String,
    },
    /// Connect all tunnels in a group
    Connect {
        /// Group name
        name: String,
    },
    /// Disconnect all tunnels in a group
    Disconnect {
        /// Group name
        name: String,
    },
}

fn main() {
    let cli = Cli::parse();
    let json = cli.json;
    let workspace = &cli.workspace;

    let result = match cli.command {
        Commands::Ls { tag } => commands::ls::run(workspace, tag.as_deref(), json),
        Commands::Connect { name, detach } => commands::connect::run(workspace, &name, detach),
        Commands::Disconnect { name } => commands::disconnect::run(workspace, &name),
        Commands::Status { verbose } => commands::status::run(json, verbose),
        Commands::Scan { port } => commands::scan::run(&port, json),
        Commands::Kill { port } => commands::kill::run(port),
        Commands::History { limit, source } => {
            commands::history::run(workspace, limit, source.as_deref(), json)
        }
        Commands::Logs { name } => commands::logs::run(workspace, &name),
        Commands::ImportSsh => commands::import_ssh::run(),
        Commands::Export { output, format } => {
            commands::export::run(workspace, output.as_deref(), &format)
        }
        Commands::Import { file } => commands::import_cmd::run(workspace, &file),
        Commands::Group { action } => match action {
            GroupAction::Ls => commands::group::list(workspace, json),
            GroupAction::Create { name, profiles } => {
                commands::group::create(workspace, &name, &profiles)
            }
            GroupAction::Delete { name } => commands::group::delete(workspace, &name),
            GroupAction::Connect { name } => commands::group::connect(workspace, &name),
            GroupAction::Disconnect { name } => commands::group::disconnect(workspace, &name),
        },
    };

    if let Err(e) = result {
        eprintln!("\x1b[31merror:\x1b[0m {}", e);
        std::process::exit(1);
    }
}
