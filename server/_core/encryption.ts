import crypto from "crypto";
import { ENV } from "./env";

/**
 * Encryption utilities for securing sensitive credentials (API keys, tokens, webhooks).
 * Uses AES-256-GCM for authenticated encryption.
 * 
 * Security considerations:
 * - All credentials are encrypted at rest in the database
 * - Encryption key is derived from JWT_SECRET (same as session tokens)
 * - Each encryption uses a unique IV (initialization vector)
 * - Authentication tag prevents tampering
 * - Keys are never logged or exposed in error messages
 */

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)

/**
 * Derive encryption key from JWT secret
 * Uses PBKDF2 for key derivation (same pattern as Manus)
 */
function getEncryptionKey(): Buffer {
  const secret = ENV.cookieSecret;
  // Use PBKDF2 to derive a consistent 32-byte key from the secret
  return crypto.pbkdf2Sync(secret, "shashclaw-encryption", 100000, 32, "sha256");
}

/**
 * Encrypt a sensitive string (API key, token, webhook URL)
 * Returns encrypted data as base64 string with IV and auth tag
 */
export function encryptCredential(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (all base64 encoded)
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, "hex")]);
    return combined.toString("base64");
  } catch (error) {
    console.error("[Encryption] Failed to encrypt credential");
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt a credential
 * Verifies authentication tag to detect tampering
 */
export function decryptCredential(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encrypted, "base64");

    // Extract IV, auth tag, and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt credential - possible tampering detected");
    throw new Error("Decryption failed - credential may be corrupted or tampered");
  }
}

/**
 * Mask a credential for logging/display
 * Shows only first and last 4 characters
 */
export function maskCredential(credential: string): string {
  if (credential.length <= 8) {
    return "***";
  }
  return `${credential.slice(0, 4)}...${credential.slice(-4)}`;
}

/**
 * Validate that a string looks like an API key (basic check)
 * Prevents obviously invalid keys from being stored
 */
export function isValidApiKey(key: string): boolean {
  return (
    typeof key === "string" &&
    key.length >= 10 &&
    key.length <= 500 &&
    /^[a-zA-Z0-9\-_.]+$/.test(key)
  );
}

/**
 * Validate webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
