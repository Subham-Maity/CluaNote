use std::fs;
use std::path::PathBuf;

use crate::crypto::{
    decrypt_url, encrypt_url, get_app_dir, get_or_create_master_key, EncryptedStore,
};
use crate::models::PostgresConfigInfo;
use crate::sync::{
    connect_to_postgres, map_pg_error, redact_connection_url, validate_and_sanitize_url,
    TABLE_INIT_SQL,
};

pub fn get_config_path() -> Result<PathBuf, String> {
    let app_dir = get_app_dir()?;
    Ok(app_dir.join("sync_config.json"))
}

pub async fn save_postgres_config_impl(
    raw_url: &str,
    auto_sync: bool,
) -> Result<PostgresConfigInfo, String> {
    let sanitized_url = validate_and_sanitize_url(raw_url)?;

    // Test connection and ensure tables exist
    let client = connect_to_postgres(&sanitized_url).await?;
    client
        .batch_execute(TABLE_INIT_SQL)
        .await
        .map_err(|e| format!("Failed to initialize table: {}", map_pg_error(e)))?;

    let master_key = get_or_create_master_key()?;
    let (nonce_hex, ciphertext_hex) = encrypt_url(&master_key, &sanitized_url)?;
    let config_path = get_config_path()?;

    let store = EncryptedStore {
        nonce_hex,
        ciphertext_hex,
        auto_sync,
        last_synced_at: None,
        last_error: None,
    };

    let json_str = serde_json::to_string_pretty(&store).map_err(|e| e.to_string())?;
    fs::write(&config_path, json_str).map_err(|e| format!("Failed to save config: {}", e))?;

    Ok(PostgresConfigInfo {
        is_configured: true,
        redacted_url: Some(redact_connection_url(&sanitized_url)),
        auto_sync,
        last_synced_at: None,
        last_error: None,
    })
}

pub fn get_postgres_config_impl() -> Result<PostgresConfigInfo, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        return Ok(PostgresConfigInfo {
            is_configured: false,
            redacted_url: None,
            auto_sync: false,
            last_synced_at: None,
            last_error: None,
        });
    }

    let bytes = fs::read(&config_path).map_err(|e| e.to_string())?;
    let store: EncryptedStore = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;

    let master_key = get_or_create_master_key()?;
    let raw_url = decrypt_url(&master_key, &store.nonce_hex, &store.ciphertext_hex).ok();

    Ok(PostgresConfigInfo {
        is_configured: true,
        redacted_url: raw_url.map(|u| redact_connection_url(&u)),
        auto_sync: store.auto_sync,
        last_synced_at: store.last_synced_at,
        last_error: store.last_error,
    })
}

pub fn get_decrypted_url() -> Result<String, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        return Err("No PostgreSQL database configured. Please save your database URL first.".to_string());
    }

    let bytes = fs::read(&config_path).map_err(|e| e.to_string())?;
    let store: EncryptedStore = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;

    let master_key = get_or_create_master_key()?;
    decrypt_url(&master_key, &store.nonce_hex, &store.ciphertext_hex)
}

pub fn disconnect_postgres_impl() -> Result<(), String> {
    let config_path = get_config_path()?;
    if config_path.exists() {
        let _ = fs::remove_file(&config_path);
    }
    Ok(())
}
