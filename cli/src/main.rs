mod commands;
mod output;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "porthole",
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
    Status,

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

    /// Export profiles to JSON file
    Export {
        /// Output file path
        #[arg(short, long)]
        output: Option<String>,
    },

    /// Import profiles from JSON file
    Import {
        /// JSON file path
        file: String,
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
        Commands::Status => commands::status::run(json),
        Commands::Scan { port } => commands::scan::run(&port, json),
        Commands::Kill { port } => commands::kill::run(port),
        Commands::History { limit, source } => commands::history::run(workspace, limit, source.as_deref(), json),
        Commands::Logs { name } => commands::logs::run(workspace, &name),
        Commands::ImportSsh => commands::import_ssh::run(),
        Commands::Export { output } => commands::export::run(workspace, output.as_deref()),
        Commands::Import { file } => commands::import_cmd::run(workspace, &file),
    };

    if let Err(e) = result {
        eprintln!("\x1b[31merror:\x1b[0m {}", e);
        std::process::exit(1);
    }
}
