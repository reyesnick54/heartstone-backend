import { AuthorityActionType } from '@prisma/client';

import { ACTOR_BINDING_FAILURE_CODES } from '../../identity/auth/context/actor-context.types';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import {
  buildActorBindingConsequentialDenial,
  mapActorBindingFailureToExplanationCode,
} from './actor-binding-denial.util';

describe('actor-binding-denial.util', () => {
  it('maps actor binding failures to authority explanation codes', () => {
    expect(
      mapActorBindingFailureToExplanationCode(ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED),
    ).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK);
    expect(
      mapActorBindingFailureToExplanationCode(ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_CURRENT),
    ).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT);
    expect(
      mapActorBindingFailureToExplanationCode(ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_CURRENT),
    ).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION);
  });

  it('builds consequential denial payloads with explanation codes', () => {
    const denial = buildActorBindingConsequentialDenial({
      code: ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED,
      message: 'Officeholder is not linked to the authenticated actor',
      functionAuthorityRecordId: 'fn-id',
      identityId: 'identity-id',
      action: AuthorityActionType.APPROVE,
    });

    expect(denial.explanationCodes).toEqual([
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK,
    ]);
    expect(denial.outcome).toBe('DENY');
  });
});
