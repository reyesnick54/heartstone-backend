import { HttpStatus } from '@nestjs/common';

/**
 * Stable, machine-readable error codes returned in the `code` field of error bodies.
 * Clients must branch on `code`, never on `message` text. See docs/architecture/api-error-codes.md.
 */
export const API_ERROR_CODES = {
  /** The session's authentication is too old for this route; re-authenticate, then retry. */
  STEP_UP_REQUIRED: 'STEP_UP_REQUIRED',
  /** The route needs a session established with multi-factor authentication. */
  MFA_REQUIRED: 'MFA_REQUIRED',
  /** The session's assurance level is below the route's minimum. */
  ASSURANCE_INSUFFICIENT: 'ASSURANCE_INSUFFICIENT',
  /** Processing was stopped deliberately because a required control could not be established. */
  SAFE_HALT: 'SAFE_HALT',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Shape accepted by the global exception filter as a client-safe `code`. Codes are uppercase
 * identifiers; anything else (driver codes, free text) is dropped rather than echoed.
 */
export const API_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

export interface CodedErrorBody {
  statusCode: number;
  message: string;
  error: string;
  code: ApiErrorCode;
}

function statusLabel(status: HttpStatus): string {
  const key = HttpStatus[status] as string | undefined;
  if (!key) {
    return 'Error';
  }
  return key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Body for an HttpException that keeps Nest's default shape (statusCode, message, error) and
 * adds a stable `code`. Pass it as the exception's response object.
 */
export function codedErrorBody(
  status: HttpStatus,
  message: string,
  code: ApiErrorCode,
): CodedErrorBody {
  return { statusCode: status, message, error: statusLabel(status), code };
}
