import { AuthorityEvaluationOutcome } from '@prisma/client';

import {
  ACTOR_BINDING_FAILURE_CODES,
  type ActorBindingFailureCode,
} from '../../identity/auth/context/actor-context.types';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';
import { type AuthorityEvaluationResponseDto } from '../evaluation/dto/authority-evaluation-response.dto';
import { AuthorityEvaluationStatus } from '../policy/authority-evaluation-status.enum';
import { buildConsequentialActionDenial } from './consequential-action-denial.util';

export function mapActorBindingFailureToExplanationCode(
  code: ActorBindingFailureCode,
): AuthorityExplanationCode {
  switch (code) {
    case ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED:
    case ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK;
    case ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_CURRENT:
    case ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_FUTURE:
    case ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_REVOKED:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT;
    case ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_SUSPENDED:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_APPOINTMENT;
    case ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_CURRENT:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION;
    case ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_OWNED:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION;
    case ACTOR_BINDING_FAILURE_CODES.NO_CURRENT_APPOINTMENT:
    case ACTOR_BINDING_FAILURE_CODES.AMBIGUOUS_APPOINTMENT:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT;
    case ACTOR_BINDING_FAILURE_CODES.SERVICE_CANNOT_IMPERSONATE:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.SERVICE_IDENTITY_NOT_HUMAN;
    default:
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.DENY;
  }
}

export function buildActorBindingConsequentialDenial(input: {
  code: ActorBindingFailureCode;
  message: string;
  functionAuthorityRecordId: string;
  identityId: string;
  action: AuthorityEvaluationResponseDto['action'];
}): ReturnType<typeof buildConsequentialActionDenial> {
  const explanationCode = mapActorBindingFailureToExplanationCode(input.code);
  const evaluation: AuthorityEvaluationResponseDto = {
    evaluationId: '',
    functionAuthorityRecordId: input.functionAuthorityRecordId,
    identityId: input.identityId,
    action: input.action,
    outcome: AuthorityEvaluationOutcome.DENY,
    status: AuthorityEvaluationStatus.NOT_AUTHORIZED,
    explanationCodes: [explanationCode],
    summary: input.message,
    safeHalt: false,
    requiresRevalidation: false,
    evaluatedAt: new Date(),
  };

  return buildConsequentialActionDenial(
    evaluation,
    'Consequential action blocked: institutional actor binding failed.',
  );
}
