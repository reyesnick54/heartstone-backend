import { ForbiddenException } from '@nestjs/common';
import {
  type AuthorityActionType,
  AuthorityEvaluationOutcome,
  IdentityType,
} from '@prisma/client';

import { type AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import {
  CASE_ASSIGNMENT_NO_ENFORCEMENT_AUTHORITY_MESSAGE,
  TECHNICAL_ADMIN_CANNOT_SANCTION_MESSAGE,
} from '../inspection-compliance.constants';

export interface ComplianceAuthorityContext {
  identityId: string;
  officeholderId?: string;
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  isAiActor?: boolean;
  isTechnicalAdminOnly?: boolean;
  hasCaseAssignmentOnly?: boolean;
}

export async function assertComplianceAuthority(
  authorityEvaluation: AuthorityEvaluationService,
  context: ComplianceAuthorityContext,
): Promise<string> {
  if (context.isAiActor) {
    throw new ForbiddenException('AI cannot perform consequential compliance enforcement actions');
  }

  if (context.isTechnicalAdminOnly) {
    throw new ForbiddenException(TECHNICAL_ADMIN_CANNOT_SANCTION_MESSAGE);
  }

  if (context.hasCaseAssignmentOnly) {
    throw new ForbiddenException(CASE_ASSIGNMENT_NO_ENFORCEMENT_AUTHORITY_MESSAGE);
  }

  const evaluation = await authorityEvaluation.evaluate({
    functionAuthorityRecordId: context.functionAuthorityRecordId,
    identityId: context.identityId,
    officeholderId: context.officeholderId,
    action: context.action,
  });

  if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
    throw new ForbiddenException(
      `Authority evaluation denied ${context.action} for compliance action`,
    );
  }

  return evaluation.evaluationId;
}

export function assertNotServiceIdentity(identityType: IdentityType): void {
  if (identityType === IdentityType.SERVICE) {
    throw new ForbiddenException('Service identities cannot confirm noncompliance findings');
  }
}
