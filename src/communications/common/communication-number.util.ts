import { randomBytes } from 'node:crypto';

import { COMMUNICATION_NUMBER_PREFIX } from '../communications.constants';

export function generateCommunicationMessageNumber(sequence?: number): string {
  const year = new Date().getUTCFullYear();
  if (sequence !== undefined) {
    return `${COMMUNICATION_NUMBER_PREFIX}-${String(year)}-${String(sequence).padStart(6, '0')}`;
  }
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${COMMUNICATION_NUMBER_PREFIX}-${String(year)}-${suffix}`;
}
