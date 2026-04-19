pub mod commands;
pub mod database;
pub mod port_utils;
pub mod store;
pub mod tunnel_manager;
pub mod types;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Second launch: focus the existing window instead of opening a new one
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            // Forward deep link URLs that arrive as single-instance args (Windows)
            for arg in &args {
                if arg.starts_with("wayport://") {
                    let _ = app.emit("deep-link-received", arg.clone());
                }
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            app.handle().plugin(tauri_plugin_dialog::init())?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let config_dir = app
                .path()
                .app_config_dir()
                .expect("Failed to get config dir");
            let store = store::Store::new(config_dir);
            let tunnel_manager = tunnel_manager::TunnelManager::new();
            let port_monitor_manager = port_utils::PortMonitorManager::new();

            app.manage(store);
            app.manage(tunnel_manager);
            app.manage(port_monitor_manager);

            // ── Deep link handler (OAuth callback) ────────────────────────
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let _ = handle.emit("deep-link-received", url.to_string());
                }
            });

            // ── System tray ──────────────────────────────────────────────────
            let show_item = MenuItem::with_id(app, "show", "Show Wayport", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let disconnect_item =
                MenuItem::with_id(app, "disconnect_all", "Disconnect All", true, None::<&str>)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Wayport", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&show_item, &sep1, &disconnect_item, &sep2, &quit_item],
            )?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Wayport — No active tunnels")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "disconnect_all" => {
                        let tm = app.state::<tunnel_manager::TunnelManager>();
                        tm.stop_all_tunnels();
                        commands::update_tray_tooltip(app);
                    }
                    "quit" => {
                        let tm = app.state::<tunnel_manager::TunnelManager>();
                        tm.stop_all_tunnels();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Close to tray instead of quitting ─────────────────────────
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Existing profile + tunnel commands
            commands::list_profiles,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::pin_profile,
            commands::unpin_profile,
            commands::get_recent_profiles,
            commands::start_tunnel,
            commands::stop_tunnel,
            commands::stop_all_tunnels,
            commands::get_tunnel_states,
            commands::get_tunnel_logs,
            commands::get_tunnel_stats,
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
            // Tunnel Groups
            commands::list_groups,
            commands::create_group,
            commands::update_group,
            commands::delete_group,
            commands::start_group,
            commands::stop_group,
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
            // SSH key management
            commands::list_ssh_keys,
            commands::get_public_key,
            commands::generate_ssh_key,
            // SSH config import + port utilities
            commands::import_ssh_config,
            commands::find_next_available_port,
            // Autostart
            commands::get_autostart_enabled,
            commands::set_autostart_enabled,
            // Connection test
            commands::test_connection,
            // Open terminal
            commands::open_terminal,
            // Auth tokens (cloud sync SSO)
            commands::load_auth_tokens,
            commands::save_auth_tokens,
            commands::clear_auth_tokens,
        ])
        .run(context)
        .expect("error while running tauri application");
}
