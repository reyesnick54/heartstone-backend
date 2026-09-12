import { randomBytes } from 'node:crypto';

import { APPLICATION_NUMBER_PREFIX } from './applications.constants';

export function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${APPLICATION_NUMBER_PREFIX}-${String(year)}-${suffix}`;
}

export function generateAcknowledgmentReference(
  applicationNumber: string,
  submissionSequence: number,
): string {
  return `${applicationNumber}-SUB-${String(submissionSequence).padStart(3, '0')}`;
}
