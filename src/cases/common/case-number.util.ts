import { randomBytes } from 'node:crypto';

import { CASE_NUMBER_PREFIX } from '../cases.constants';

export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${CASE_NUMBER_PREFIX}-${year}-${suffix}`;
}
