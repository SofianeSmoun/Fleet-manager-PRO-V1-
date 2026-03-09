import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env['BACKUP_ENCRYPTION_KEY'];
  if (!hex || hex.length !== 64) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be 32 bytes hex (64 chars). Generate with: openssl rand -hex 32');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(data: Buffer): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: [IV (16 bytes)] [AuthTag (16 bytes)] [Encrypted data]
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decrypt(data: Buffer): Buffer {
  const key = getKey();
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
