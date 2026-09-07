use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedStore {
    pub nonce_hex: String,
    pub ciphertext_hex: String,
    pub auto_sync: bool,
    pub last_synced_at: Option<String>,
    pub last_error: Option<String>,
}

pub fn get_app_dir() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("cluanote-sync-server");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    Ok(dir)
}

pub fn get_or_create_master_key() -> Result<[u8; 32], String> {
    let app_dir = get_app_dir()?;
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

pub fn encrypt_url(key: &[u8; 32], raw_url: &str) -> Result<(String, String), String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, raw_url.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    Ok((hex::encode(nonce_bytes), hex::encode(ciphertext)))
}

pub fn decrypt_url(key: &[u8; 32], nonce_hex: &str, ciphertext_hex: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce_bytes = hex::decode(nonce_hex).map_err(|e| format!("Invalid nonce hex: {}", e))?;
    let ciphertext =
        hex::decode(ciphertext_hex).map_err(|e| format!("Invalid ciphertext hex: {}", e))?;

    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 in decrypted URL: {}", e))
}
