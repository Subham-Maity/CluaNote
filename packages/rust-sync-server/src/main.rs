mod config;
mod crypto;
mod models;
mod sync;

use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Router,
};
use std::env;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

use config::{disconnect_postgres_impl, get_postgres_config_impl, save_postgres_config_impl};
use models::{ConnectionTestResult, PostgresConfigInfo, SaveConfigRequest, SyncRequest, SyncResult, TestConnectionRequest};
use sync::{sync_postgres_impl, test_postgres_connection_impl};

#[tokio::main]
async fn main() {
    // Determine listening port and address
    let port: u16 = env::var("CLUANOTE_SYNC_PORT")
        .or_else(|_| env::var("PORT"))
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(7842);

    let host = env::var("CLUANOTE_SYNC_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .expect("Invalid host or port");

    println!("====================================================");
    println!("  CluaNote Sync Server v{}", env!("CARGO_PKG_VERSION"));
    println!("  Listening on http://{}", addr);
    println!("====================================================");

    let app = Router::new()
        .route("/", get(health_handler))
        .route("/health", get(health_handler))
        .route("/api/config", get(get_config_handler))
        .route("/api/config", post(save_config_handler))
        .route("/api/config", delete(disconnect_config_handler))
        .route("/api/test", post(test_connection_handler))
        .route("/api/sync", post(sync_handler))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "app": "CluaNote Sync Server",
            "version": env!("CARGO_PKG_VERSION")
        })),
    )
}

async fn get_config_handler() -> Result<Json<PostgresConfigInfo>, (StatusCode, Json<serde_json::Value>)> {
    match get_postgres_config_impl() {
        Ok(info) => Ok(Json(info)),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

async fn save_config_handler(
    Json(payload): Json<SaveConfigRequest>,
) -> Result<Json<PostgresConfigInfo>, (StatusCode, Json<serde_json::Value>)> {
    let auto_sync = payload.auto_sync.unwrap_or(true);
    match save_postgres_config_impl(&payload.url, auto_sync).await {
        Ok(info) => Ok(Json(info)),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

async fn disconnect_config_handler() -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    match disconnect_postgres_impl() {
        Ok(_) => Ok(StatusCode::OK),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

async fn test_connection_handler(
    Json(payload): Json<TestConnectionRequest>,
) -> Result<Json<ConnectionTestResult>, (StatusCode, Json<serde_json::Value>)> {
    match test_postgres_connection_impl(payload.url).await {
        Ok(res) => Ok(Json(res)),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}

async fn sync_handler(
    Json(payload): Json<SyncRequest>,
) -> Result<Json<SyncResult>, (StatusCode, Json<serde_json::Value>)> {
    match sync_postgres_impl(payload.local_tasks).await {
        Ok(res) => Ok(Json(res)),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        )),
    }
}
