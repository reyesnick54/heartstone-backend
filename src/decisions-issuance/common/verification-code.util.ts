import { createHash, randomBytes } from 'node:crypto';

import {
  VERIFICATION_CODE_BYTES,
  VERIFICATION_URI_PATH_PREFIX,
} from '../decisions-issuance.constants';

export function generateVerificationCode(): string {
  return randomBytes(VERIFICATION_CODE_BYTES).toString('base64url');
}

export function buildVerificationUri(verificationCode: string, publicBaseUrl?: string): string {
  const path = `${VERIFICATION_URI_PATH_PREFIX}/${verificationCode}`;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}${path}`;
  }

  return path;
}

export function hashClientReference(reference: string): string {
  return createHash('sha256').update(reference).digest('hex');
}
