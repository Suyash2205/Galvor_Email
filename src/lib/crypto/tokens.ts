import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/lib/system/env";

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted token is malformed.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function getKey() {
  if (!env.tokenEncryptionKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to encrypt Gmail refresh tokens.");
  }
  return createHash("sha256").update(env.tokenEncryptionKey).digest();
}

