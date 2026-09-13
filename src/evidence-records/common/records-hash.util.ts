import { createHash } from 'node:crypto';

export function hashRecordsPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function buildScheduleSnapshot(input: {
  code: string;
  versionNumber: number;
  triggerType: string;
  triggerConfiguration: unknown;
  retentionDurationValue: number | null | undefined;
  retentionDurationUnit: string | null | undefined;
  governingSourceId: string;
}): string {
  return hashRecordsPayload(input);
}
