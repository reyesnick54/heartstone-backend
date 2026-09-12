import { ForbiddenException } from '@nestjs/common';
import { AuthorityActionType, AuthorityEvaluationOutcome } from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';

export interface ConsequentialAuthorityInput {
  identityId: string;
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
}

export async function requireConsequentialAuthority(
  authorityEvaluation: AuthorityEvaluationService,
  input: ConsequentialAuthorityInput,
): Promise<void> {
  const evaluation = await authorityEvaluation.evaluate({
    identityId: input.identityId,
    functionAuthorityRecordId: input.functionAuthorityRecordId,
    action: input.action,
    officeholderId: input.officeholderId,
    officeId: input.officeId,
    appointmentId: input.appointmentId,
    delegationId: input.delegationId,
  });

  if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
    throw new ForbiddenException(
      `Consequential records operation requires authority evaluation: ${evaluation.outcome}`,
    );
  }
}
