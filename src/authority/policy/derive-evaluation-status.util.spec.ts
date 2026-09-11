import { AuthorityEvaluationOutcome } from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { AuthorityEvaluationStatus } from './authority-evaluation-status.enum';
import { deriveEvaluationStatus } from './derive-evaluation-status.util';

describe('deriveEvaluationStatus', () => {
  it('maps ALLOW outcome to ALLOW status', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.ALLOW, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.ALLOW,
      ]),
    ).toBe(AuthorityEvaluationStatus.ALLOW);
  });

  it('maps SAFE_HALT outcome to SAFE_HALT status', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.SAFE_HALT, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT,
      ]),
    ).toBe(AuthorityEvaluationStatus.SAFE_HALT);
  });

  it('maps external determination outcome', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
      ]),
    ).toBe(AuthorityEvaluationStatus.REQUIRES_EXTERNAL_DETERMINATION);
  });

  it('maps professional review codes', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.DENY, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL,
      ]),
    ).toBe(AuthorityEvaluationStatus.REQUIRES_PROFESSIONAL_REVIEW);
  });

  it('maps blocked codes', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.DENY, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.PROHIBITED_FUNCTION,
      ]),
    ).toBe(AuthorityEvaluationStatus.BLOCKED);
  });

  it('maps generic deny to NOT_AUTHORIZED', () => {
    expect(
      deriveEvaluationStatus(AuthorityEvaluationOutcome.DENY, [
        AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT,
      ]),
    ).toBe(AuthorityEvaluationStatus.NOT_AUTHORIZED);
  });
});
