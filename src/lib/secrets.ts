import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Encrypts small secrets (mailbox passwords) before they are stored in the database.
 * The key is derived from JWT_SECRET, so changing that secret means mailbox passwords must be re-entered.
 */
const key = () => createHash('sha256').update(process.env.JWT_SECRET || 'fallback_secret_key_for_development').digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

/** Returns null when the value cannot be decrypted (wrong key or corrupted value). */
export function decryptSecret(stored: string): string | null {
  try {
    const [iv, tag, data] = stored.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
