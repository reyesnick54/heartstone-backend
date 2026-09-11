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
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = (await scryptAsync(secret, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifySecret(secret: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(secret, salt, SCRYPT_KEYLEN)) as Buffer;

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
