import { createHash } from 'node:crypto';

export function hashSubmissionContent(input: {
  answers: Record<string, unknown>;
  formVersionId: string;
  governmentServiceVersionId: string;
  configurationFingerprint: string;
}): string {
  const payload = {
    answers: input.answers,
    formVersionId: input.formVersionId,
    governmentServiceVersionId: input.governmentServiceVersionId,
    configurationFingerprint: input.configurationFingerprint,
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
