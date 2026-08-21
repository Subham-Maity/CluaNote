//! Typed error module for CluaNote Tauri backend commands.

use serde::Serialize;
use thiserror::Error;

/// CommandError defines typed errors that serialize across the Tauri IPC boundary to the frontend.
#[derive(Debug, Error)]
pub enum CommandError {
    #[error("Database error: {0}")]
    Db(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
