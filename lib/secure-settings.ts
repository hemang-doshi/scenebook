import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getDerivedKey() {
  if (!env.settingsEncryptionKey) {
    throw new Error("SETTINGS_ENCRYPTION_KEY is required to store provider tokens.");
  }

  return createHash("sha256").update(env.settingsEncryptionKey).digest();
}

export function encryptSecret(secret: string | null | undefined) {
  const normalized = secret?.trim();

  if (!normalized) {
    return null;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getDerivedKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(secret: string | null | undefined) {
  if (!secret) {
    return "";
  }

  const [ivPart, tagPart, payloadPart] = secret.split(":");

  if (!ivPart || !tagPart || !payloadPart) {
    return secret;
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, getDerivedKey(), Buffer.from(ivPart, "base64"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadPart, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt secret (encryption key may have changed):", err);
    return "";
  }
}

export function maskSecret(secret: string | null | undefined) {
  const normalized = secret?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}••••`;
  }

  return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
}
