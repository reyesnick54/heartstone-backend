import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEY_LENGTH = 64;

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(secret, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifySecret(secret: string, storedHash: string): boolean {
  const [salt, expectedKey] = storedHash.split(':');

  if (!salt || !expectedKey) {
    return false;
  }

  const derivedKey = scryptSync(secret, salt, SCRYPT_KEY_LENGTH).toString('hex');
  const expectedBuffer = Buffer.from(expectedKey, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedBuffer);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}
