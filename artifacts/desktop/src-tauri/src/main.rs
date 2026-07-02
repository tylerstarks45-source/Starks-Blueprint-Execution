#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Default remote URL for the desktop shell. Overridable at runtime with the
/// `DESKTOP_APP_URL` environment variable, e.g. to point at a local dev
/// server (`http://localhost:22333`) instead of the production site.
const DEFAULT_APP_URL: &str = "https://starksglobalgroup.net";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let url = std::env::var("DESKTOP_APP_URL").unwrap_or_else(|_| DEFAULT_APP_URL.to_string());
            let parsed = url
                .parse()
                .unwrap_or_else(|_| DEFAULT_APP_URL.parse().expect("default URL is valid"));

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Starks Global Group")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Starks Global Group desktop shell");
}
