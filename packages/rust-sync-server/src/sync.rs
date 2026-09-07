use chrono::{DateTime, Utc};
use std::fs;
use url::Url;

use crate::config::{get_config_path, get_decrypted_url};
use crate::crypto::EncryptedStore;
use crate::models::{ConnectionTestResult, SyncResult, SyncTask};

pub const TABLE_INIT_SQL: &str = r#"
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

pub fn parse_iso_or_now(s: &str) -> DateTime<Utc> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        dt.with_timezone(&Utc)
    } else {
        Utc::now()
    }
}

pub fn map_pg_error(e: tokio_postgres::Error) -> String {
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
        "SSL/TLS handshake failed. Ensure your database supports SSL (e.g., sslmode=require)."
            .to_string()
    } else {
        format!("PostgreSQL Error: {}", s)
    }
}

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
        format!(
            "Invalid connection URL format. Expected 'postgresql://user:pass@host/db': {}",
            e
        )
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
            return Err("Your connection string contains masked bullet points. Please provide the actual password.".to_string());
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

pub async fn connect_to_postgres(url: &str) -> Result<tokio_postgres::Client, String> {
    let builder = native_tls::TlsConnector::builder();
    let tls_connector = builder
        .build()
        .map_err(|e| format!("Failed to initialize native TLS connector: {}", e))?;
    let connector = postgres_native_tls::MakeTlsConnector::new(tls_connector);

    let (client, connection) = tokio_postgres::connect(url, connector)
        .await
        .map_err(map_pg_error)?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Background Postgres connection ended: {}", e);
        }
    });

    Ok(client)
}

pub async fn test_postgres_connection_impl(
    raw_url: Option<String>,
) -> Result<ConnectionTestResult, String> {
    let url_to_use = match raw_url {
        Some(u) if !u.trim().is_empty() => u,
        _ => get_decrypted_url()?,
    };

    let sanitized_url = validate_and_sanitize_url(&url_to_use)?;
    let client = connect_to_postgres(&sanitized_url).await?;

    let row = client
        .query_one("SELECT version() as ver;", &[])
        .await
        .map_err(map_pg_error)?;

    let ver: String = row.get("ver");

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

pub async fn sync_postgres_impl(local_tasks: Vec<SyncTask>) -> Result<SyncResult, String> {
    let raw_url = get_decrypted_url()?;
    let config_path = get_config_path()?;

    let bytes = fs::read(&config_path).map_err(|e| e.to_string())?;
    let mut store: EncryptedStore = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;

    let mut client = connect_to_postgres(&raw_url).await.map_err(|e| {
        let _ = update_last_error(&config_path, &mut store, &e);
        e
    })?;

    // Ensure schema exists
    client
        .batch_execute(TABLE_INIT_SQL)
        .await
        .map_err(|e| format!("Schema setup error: {}", map_pg_error(e)))?;

    let tx = client
        .transaction()
        .await
        .map_err(|e| format!("Transaction error: {}", map_pg_error(e)))?;

    // 1. Fetch all remote rows from PostgreSQL FIRST
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
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at_str,
                to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at_str,
                is_deleted,
                is_future_note
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

    // 2. Reconcile differences: PULL latest remote tasks FIRST, PUSH newer local tasks
    let local_map: std::collections::HashMap<String, &SyncTask> =
        local_tasks.iter().map(|t| (t.uuid.clone(), t)).collect();
    let remote_map: std::collections::HashMap<String, &SyncTask> =
        remote_tasks.iter().map(|t| (t.uuid.clone(), t)).collect();

    // Pull any remote task that is newer or newly added on another device
    let mut pulled_tasks: Vec<SyncTask> = Vec::new();
    for remote in &remote_tasks {
        if let Some(local) = local_map.get(&remote.uuid) {
            let remote_dt = parse_iso_or_now(&remote.updated_at);
            let local_dt = parse_iso_or_now(&local.updated_at);
            if remote_dt > local_dt {
                pulled_tasks.push(remote.clone());
            }
        } else {
            // New remote record -> pull
            pulled_tasks.push(remote.clone());
        }
    }

    // Determine which local tasks are genuinely newer and need pushing to remote
    let mut to_push: Vec<&SyncTask> = Vec::new();
    for local in &local_tasks {
        if let Some(remote) = remote_map.get(&local.uuid) {
            let local_dt = parse_iso_or_now(&local.updated_at);
            let remote_dt = parse_iso_or_now(&remote.updated_at);
            if local_dt > remote_dt {
                to_push.push(local);
            }
        } else {
            // New local record -> push
            to_push.push(local);
        }
    }

    // 3. Only push tasks that have newer changes
    let mut pushed_count = 0;
    if !to_push.is_empty() {
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

        for local in to_push {
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
    }

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit sync transaction: {}", map_pg_error(e)))?;

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
            "Sync successful. Pushed {} task(s), pulled {} task(s).",
            pushed_count, pulled_count
        ),
    })
}

fn update_last_error(
    config_path: &std::path::PathBuf,
    store: &mut EncryptedStore,
    err: &str,
) -> Result<(), String> {
    store.last_error = Some(err.to_string());
    if let Ok(json_str) = serde_json::to_string_pretty(&store) {
        let _ = fs::write(config_path, json_str);
    }
    Ok(())
}
