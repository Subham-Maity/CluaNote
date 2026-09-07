use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use url::Url;

fn parse_iso_or_now(iso_str: &str) -> DateTime<Utc> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(iso_str) {
        dt.with_timezone(&Utc)
    } else if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(iso_str, "%Y-%m-%d %H:%M:%S") {
        DateTime::from_naive_utc_and_offset(naive, Utc)
    } else {
        Utc::now()
    }
}

const TABLE_INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS cluanote_tasks (
    uuid VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT,
    date VARCHAR(10) NOT NULL,
    time VARCHAR(10),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_future_note INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cluanote_tasks_date ON cluanote_tasks(date);
CREATE INDEX IF NOT EXISTS idx_cluanote_tasks_updated ON cluanote_tasks(updated_at);
ALTER TABLE cluanote_tasks ALTER COLUMN completed TYPE INTEGER;
ALTER TABLE cluanote_tasks ADD COLUMN IF NOT EXISTS is_future_note INTEGER NOT NULL DEFAULT 0;
"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTask {
    pub uuid: String,
    pub title: String,
    pub note: Option<String>,
    pub date: String,
    pub time: Option<String>,
    pub priority: String,
    pub completed: i32,
    pub created_at: String,
    pub updated_at: String,
    pub is_deleted: i32, // 0 = active, 1 = deleted
    pub is_future_note: i32, // 0 = regular task, 1 = future planning note
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresConfigInfo {
    pub is_configured: bool,
    pub redacted_url: Option<String>,
    pub auto_sync: bool,
    pub last_synced_at: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EncryptedStore {
    nonce_hex: String,
    ciphertext_hex: String,
    auto_sync: bool,
    last_synced_at: Option<String>,
    last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub pushed_count: usize,
    pub pulled_count: usize,
    pub pulled_tasks: Vec<SyncTask>,
    pub synced_at: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_version: Option<String>,
}

pub struct PostgresSyncState {
    pub lock: Mutex<()>,
}

impl Default for PostgresSyncState {
    fn default() -> Self {
        Self {
            lock: Mutex::new(()),
        }
    }
}

// ----------------------------------------------------------------------------
// Encryption Helpers
// ----------------------------------------------------------------------------

fn get_or_create_master_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let key_path = app_dir.join("sync_master.key");
    if key_path.exists() {
        let bytes = fs::read(&key_path).map_err(|e| format!("Failed to read master key: {}", e))?;
        if bytes.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            return Ok(key);
        }
    }

    // Generate fresh cryptographically secure 32-byte key
    let mut key = [0u8; 32];
    rand::thread_rng().fill(&mut key);
    fs::write(&key_path, &key).map_err(|e| format!("Failed to write master key: {}", e))?;

    Ok(key)
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join("sync_config.json"))
}

fn encrypt_url(key: &[u8; 32], raw_url: &str) -> Result<(String, String), String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, raw_url.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    Ok((
        hex::encode(nonce_bytes),
        hex::encode(ciphertext),
    ))
}

fn decrypt_url(key: &[u8; 32], nonce_hex: &str, ciphertext_hex: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce_bytes = hex::decode(nonce_hex).map_err(|e| format!("Invalid nonce hex: {}", e))?;
    let ciphertext = hex::decode(ciphertext_hex).map_err(|e| format!("Invalid ciphertext hex: {}", e))?;

    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted URL: {}", e))
}

// ----------------------------------------------------------------------------
// URL Validation & Redaction
// ----------------------------------------------------------------------------

pub fn redact_connection_url(raw: &str) -> String {
    if let Ok(mut parsed) = Url::parse(raw) {
        if parsed.password().is_some() {
            let _ = parsed.set_password(Some("••••••••"));
        }
        parsed.to_string()
    } else {
        "postgresql://••••••••".to_string()
    }
}

pub fn validate_and_sanitize_url(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Connection string cannot be empty.".to_string());
    }

    let mut parsed = Url::parse(trimmed).map_err(|e| {
        format!("Invalid connection URL format. Expected 'postgresql://user:pass@host/db': {}", e)
    })?;

    let scheme = parsed.scheme();
    if scheme != "postgres" && scheme != "postgresql" {
        return Err("URL scheme must start with 'postgres://' or 'postgresql://'".to_string());
    }

    if parsed.host_str().is_none() {
        return Err("Connection URL is missing a valid host name.".to_string());
    }

    // Check for masked bullet points in password
    if let Some(pass) = parsed.password() {
        if pass.contains('•') || pass.contains("%E2%80%A2") || pass.contains("%e2%80%a2") {
            return Err("Your connection string contains masked bullet points (••••••••). Please copy the connection string from your Neon dashboard with your actual password revealed.".to_string());
        }
    }

    // Check for SSL requirement
    let query = parsed.query().unwrap_or("");
    if query.contains("sslmode=disable") {
        return Err("Plaintext connection (sslmode=disable) is not allowed. Please use SSL (e.g. sslmode=require) for secure synchronization.".to_string());
    }

    // Filter out unsupported channel_binding parameter for tokio-postgres TLS compatibility
    if query.contains("channel_binding") {
        let pairs: Vec<(String, String)> = parsed
            .query_pairs()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .filter(|(k, _)| k != "channel_binding")
            .collect();

        if pairs.is_empty() {
            parsed.set_query(None);
        } else {
            let mut ser = url::form_urlencoded::Serializer::new(String::new());
            for (k, v) in pairs {
                ser.append_pair(&k, &v);
            }
            parsed.set_query(Some(&ser.finish()));
        }
    }

    Ok(parsed.to_string())
}

fn map_pg_error(e: tokio_postgres::Error) -> String {
    let s = e.to_string();
    if s.contains("password authentication failed") || s.contains("authentication failed") {
        "Authentication failed: Invalid username or password.".to_string()
    } else if s.contains("database") && s.contains("does not exist") {
        "Database does not exist or access denied.".to_string()
    } else if s.contains("timed out") || s.contains("timeout") {
        "Connection timed out. Please check your host and network connection.".to_string()
    } else if s.contains("Connection refused") {
        "Connection refused by server. Verify host, port, and firewall rules.".to_string()
    } else if s.contains("SSL") || s.contains("tls") || s.contains("certificate") {
        "SSL/TLS handshake failed. Ensure your database supports SSL (e.g., sslmode=require).".to_string()
    } else {
        format!("PostgreSQL Error: {}", s)
    }
}

// ----------------------------------------------------------------------------
// Native TLS Connection Builder
// ----------------------------------------------------------------------------

async fn connect_to_postgres(url: &str) -> Result<tokio_postgres::Client, String> {
    let builder = native_tls::TlsConnector::builder();
    let tls_connector = builder
        .build()
        .map_err(|e| format!("Failed to initialize native TLS connector: {}", e))?;
    let connector = postgres_native_tls::MakeTlsConnector::new(tls_connector);

    let (client, connection) = tokio_postgres::connect(url, connector)
        .await
        .map_err(map_pg_error)?;

    tauri::async_runtime::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Background Postgres connection ended: {}", e);
        }
    });

    Ok(client)
}

// ----------------------------------------------------------------------------
// Tauri Commands
// ----------------------------------------------------------------------------

pub async fn test_postgres_connection_impl(url: String) -> Result<ConnectionTestResult, String> {
    let sanitized_url = validate_and_sanitize_url(&url)?;
    let client = connect_to_postgres(&sanitized_url).await?;

    let row = client
        .query_one("SELECT version() as ver;", &[])
        .await
        .map_err(map_pg_error)?;

    let ver: String = row.get("ver");

    // Initialize table and index schema
    client
        .batch_execute(TABLE_INIT_SQL)
        .await
        .map_err(|e| format!("Connected, but failed to prepare 'cluanote_tasks' table: {}", map_pg_error(e)))?;

    Ok(ConnectionTestResult {
        success: true,
        message: "Successfully connected and verified 'cluanote_tasks' table.".to_string(),
        server_version: Some(ver),
    })
}

pub async fn save_postgres_config_impl(
    app: AppHandle,
    url: String,
    auto_sync: bool,
) -> Result<PostgresConfigInfo, String> {
    let sanitized_url = validate_and_sanitize_url(&url)?;

    // Test connection first
    let client = connect_to_postgres(&sanitized_url).await?;
    client
        .batch_execute(TABLE_INIT_SQL)
        .await
        .map_err(|e| format!("Failed to initialize table: {}", map_pg_error(e)))?;

    let master_key = get_or_create_master_key(&app)?;
    let (nonce_hex, ciphertext_hex) = encrypt_url(&master_key, &sanitized_url)?;
    let config_path = get_config_path(&app)?;

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

pub async fn get_postgres_config_impl(app: AppHandle) -> Result<PostgresConfigInfo, String> {
    let config_path = get_config_path(&app)?;
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

    let master_key = get_or_create_master_key(&app)?;
    let raw_url = decrypt_url(&master_key, &store.nonce_hex, &store.ciphertext_hex).ok();

    Ok(PostgresConfigInfo {
        is_configured: true,
        redacted_url: raw_url.map(|u| redact_connection_url(&u)),
        auto_sync: store.auto_sync,
        last_synced_at: store.last_synced_at,
        last_error: store.last_error,
    })
}

pub async fn disconnect_postgres_impl(app: AppHandle) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    if config_path.exists() {
        let _ = fs::remove_file(&config_path);
    }
    Ok(())
}

pub async fn sync_postgres_impl(
    app: AppHandle,
    local_tasks: Vec<SyncTask>,
) -> Result<SyncResult, String> {
    let config_path = get_config_path(&app)?;
    if !config_path.exists() {
        return Err("No PostgreSQL database configured. Please save your database URL first.".to_string());
    }

    let bytes = fs::read(&config_path).map_err(|e| e.to_string())?;
    let mut store: EncryptedStore = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;

    let master_key = get_or_create_master_key(&app)?;
    let raw_url = decrypt_url(&master_key, &store.nonce_hex, &store.ciphertext_hex)?;

    let mut client = connect_to_postgres(&raw_url).await.map_err(|e| {
        let _ = update_last_error(&config_path, &mut store, &e);
        e
    })?;

    // Ensure table exists
    client
        .batch_execute(TABLE_INIT_SQL)
        .await
        .map_err(|e| format!("Schema setup error: {}", map_pg_error(e)))?;

    let tx = client
        .transaction()
        .await
        .map_err(|e| format!("Transaction error: {}", map_pg_error(e)))?;

    // 1. Fetch all remote rows from PostgreSQL
    let rows = tx
        .query(
            r#"
            SELECT 
                uuid, 
                title, 
                note, 
                date, 
                time, 
                priority, 
                completed, 
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at_str,
                to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at_str,
                is_deleted
            FROM cluanote_tasks
            "#,
            &[],
        )
        .await
        .map_err(|e| format!("Failed to read remote tasks: {}", map_pg_error(e)))?;

    let mut remote_tasks: Vec<SyncTask> = Vec::new();
    for row in rows {
        let uuid: String = row.get("uuid");
        let title: String = row.get("title");
        let note: Option<String> = row.get("note");
        let date: String = row.get("date");
        let time: Option<String> = row.get("time");
        let priority: String = row.get("priority");
        let completed: i32 = match row.try_get::<_, i32>("completed") {
            Ok(v) => v,
            Err(_) => row.get::<_, i16>("completed") as i32,
        };
        let created_at: String = row.get("created_at_str");
        let updated_at: String = row.get("updated_at_str");
        let is_deleted_bool: bool = row.get("is_deleted");
        let is_future_note: i32 = row.try_get::<_, i32>("is_future_note").unwrap_or(0);

        remote_tasks.push(SyncTask {
            uuid,
            title,
            note,
            date,
            time,
            priority,
            completed,
            created_at,
            updated_at,
            is_deleted: if is_deleted_bool { 1 } else { 0 },
            is_future_note,
        });
    }

    // 2. Push local tasks into PostgreSQL using UPSERT with timestamp conflict resolution
    let mut pushed_count = 0;
    let upsert_stmt = tx
        .prepare(
            r#"
            INSERT INTO cluanote_tasks (
                uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
            ON CONFLICT (uuid) DO UPDATE SET
                title = EXCLUDED.title,
                note = EXCLUDED.note,
                date = EXCLUDED.date,
                time = EXCLUDED.time,
                priority = EXCLUDED.priority,
                completed = EXCLUDED.completed,
                updated_at = EXCLUDED.updated_at,
                is_deleted = EXCLUDED.is_deleted,
                is_future_note = EXCLUDED.is_future_note
            WHERE EXCLUDED.updated_at >= cluanote_tasks.updated_at;
            "#,
        )
        .await
        .map_err(|e| format!("Failed to prepare upsert query: {}", map_pg_error(e)))?;

    for local in &local_tasks {
        let is_deleted_bool = local.is_deleted == 1;
        let completed_i32: i32 = local.completed as i32;
        let is_future_note_i32: i32 = local.is_future_note;
        let created_at_dt: DateTime<Utc> = parse_iso_or_now(&local.created_at);
        let updated_at_dt: DateTime<Utc> = parse_iso_or_now(&local.updated_at);

        tx.execute(
            &upsert_stmt,
            &[
                &local.uuid,
                &local.title,
                &local.note,
                &local.date,
                &local.time,
                &local.priority,
                &completed_i32,
                &created_at_dt,
                &updated_at_dt,
                &is_deleted_bool,
                &is_future_note_i32,
            ],
        )
        .await
        .map_err(|e| format!("Failed to sync task '{}': {}", local.title, map_pg_error(e)))?;

        pushed_count += 1;
    }

    // Commit Postgres transaction
    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit sync transaction: {}", map_pg_error(e)))?;

    // 3. Determine which remote tasks should be pulled into local SQLite
    // Conflict resolution: Remote wins if remote.updated_at > local.updated_at, or if not present locally
    let mut pulled_tasks: Vec<SyncTask> = Vec::new();
    let local_map: std::collections::HashMap<String, &SyncTask> =
        local_tasks.iter().map(|t| (t.uuid.clone(), t)).collect();

    for remote in remote_tasks {
        if let Some(local) = local_map.get(&remote.uuid) {
            // Compare timestamps
            if remote.updated_at > local.updated_at {
                pulled_tasks.push(remote);
            }
        } else {
            // New remote record (e.g. created on another device)
            pulled_tasks.push(remote);
        }
    }

    let pulled_count = pulled_tasks.len();
    let now_iso = Utc::now().to_rfc3339();

    // Update config store with success status
    store.last_synced_at = Some(now_iso.clone());
    store.last_error = None;
    if let Ok(json_str) = serde_json::to_string_pretty(&store) {
        let _ = fs::write(&config_path, json_str);
    }

    Ok(SyncResult {
        success: true,
        pushed_count,
        pulled_count,
        pulled_tasks,
        synced_at: now_iso,
        message: format!(
            "Sync successful. Pushed {} local task(s), pulled {} updated task(s).",
            pushed_count, pulled_count
        ),
    })
}

fn update_last_error(
    config_path: &PathBuf,
    store: &mut EncryptedStore,
    err: &str,
) -> Result<(), String> {
    store.last_error = Some(err.to_string());
    if let Ok(json_str) = serde_json::to_string_pretty(store) {
        let _ = fs::write(config_path, json_str);
    }
    Ok(())
}
