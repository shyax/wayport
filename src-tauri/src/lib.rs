pub mod types;
pub mod store;
pub mod tunnel_manager;
pub mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .setup(|app| {
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

      app.manage(store);
      app.manage(tunnel_manager);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::list_profiles,
      commands::create_profile,
      commands::update_profile,
      commands::delete_profile,
      commands::start_tunnel,
      commands::stop_tunnel,
      commands::stop_all_tunnels,
      commands::get_tunnel_states,
      commands::select_key_file,
      commands::check_ssh,
      commands::export_profiles,
      commands::import_profiles,
    ])
    .run(context)
    .expect("error while running tauri application");
}
