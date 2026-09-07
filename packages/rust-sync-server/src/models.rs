use serde::{Deserialize, Serialize};

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
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
    pub server_version: Option<String>,
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
pub struct SaveConfigRequest {
    pub url: String,
    pub auto_sync: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConnectionRequest {
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub local_tasks: Vec<SyncTask>,
}
