pub mod types;
pub mod database;
pub mod store;
pub mod tunnel_manager;
pub mod commands;
pub mod port_utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      // Second launch: focus the existing window instead of opening a new one
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
      }
    }))
    .setup(|app| {
      app.handle().plugin(tauri_plugin_dialog::init())?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let config_dir = app.path().app_config_dir().expect("Failed to get config dir");
      let store = store::Store::new(config_dir);
      let tunnel_manager = tunnel_manager::TunnelManager::new();
      let port_monitor_manager = port_utils::PortMonitorManager::new();

      app.manage(store);
      app.manage(tunnel_manager);
      app.manage(port_monitor_manager);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Existing profile + tunnel commands
      commands::list_profiles,
      commands::create_profile,
      commands::update_profile,
      commands::delete_profile,
      commands::start_tunnel,
      commands::stop_tunnel,
      commands::stop_all_tunnels,
      commands::get_tunnel_states,
      commands::get_tunnel_logs,
      commands::check_ssh,
      commands::export_profiles,
      commands::import_profiles,
      // Port utilities
      port_utils::scan_port,
      port_utils::scan_port_range,
      port_utils::check_port_available,
      port_utils::kill_port,
      port_utils::start_port_monitor,
      port_utils::stop_port_monitor,
      // Workspaces
      commands::list_workspaces,
      // Folders
      commands::list_folders,
      commands::create_folder,
      commands::update_folder,
      commands::delete_folder,
      // Environments
      commands::list_environments,
      commands::create_environment,
      commands::update_environment,
      commands::delete_environment,
      // History
      commands::get_history,
      commands::record_connection_event,
      // Preferences
      commands::get_preference,
      commands::set_preference,
      // SSH config import + port utilities
      commands::import_ssh_config,
      commands::find_next_available_port,
    ])
    .run(context)
    .expect("error while running tauri application");
}
